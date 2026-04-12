import nock from 'nock';
import { logInfo } from '../telemetry/logger';
import { WhisperTranscriptionService } from './whisper-transcription-service';
import { ServiceUnavailableError } from '../../domain/errors';

jest.mock('../telemetry/logger', () => ({
  logInfo: jest.fn(),
}));

const WHISPER_URL = 'http://127.0.0.1:7600';
const fakeAudio = Buffer.from('ogg-audio-data');
const fakeWav = Buffer.from('wav-audio-data');
const mockConverter = jest.fn();

describe('WhisperTranscriptionService', () => {
  let service: WhisperTranscriptionService;

  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
    mockConverter.mockResolvedValue(fakeWav);
    service = new WhisperTranscriptionService(WHISPER_URL, mockConverter);
  });

  it('converts the audio format before sending to whisper', async () => {
    nock(WHISPER_URL).post('/inference').reply(200, { text: 'Bonjour !' });

    await service.transcribe(fakeAudio);

    expect(mockConverter).toHaveBeenCalledWith(fakeAudio);
  });

  it('throws when audio conversion fails', async () => {
    mockConverter.mockRejectedValue(new Error('ffmpeg error'));

    await expect(service.transcribe(fakeAudio)).rejects.toThrow('ffmpeg error');
  });

  it('returns the transcribed text', async () => {
    nock(WHISPER_URL).post('/inference').reply(200, { text: 'Je veux parler de cuisine.' });

    const result = await service.transcribe(fakeAudio);

    expect(result).toBe('Je veux parler de cuisine.');
  });

  it('trims leading and trailing whitespace from the whisper response', async () => {
    nock(WHISPER_URL).post('/inference').reply(200, { text: '  Je veux parler de cuisine.  ' });

    const result = await service.transcribe(fakeAudio);

    expect(result).toBe('Je veux parler de cuisine.');
  });

  it('throws ServiceUnavailableError when whisper responds with an error', async () => {
    nock(WHISPER_URL).post('/inference').reply(503);

    await expect(service.transcribe(fakeAudio)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  describe('transcription content capture', () => {
    afterEach(() => {
      delete process.env.OTEL_WHATSAPP_CAPTURE_TRANSCRIPTION;
    });

    it('emits the transcribed text as an OTel log record when capture is enabled', async () => {
      process.env.OTEL_WHATSAPP_CAPTURE_TRANSCRIPTION = 'true';
      nock(WHISPER_URL).post('/inference').reply(200, { text: 'Je veux parler de cuisine.' });

      await service.transcribe(fakeAudio);

      expect(logInfo).toHaveBeenCalledWith('Je veux parler de cuisine.', { 'event.name': 'whatsapp.transcription' });
    });

    it('does not emit a log record when capture is disabled', async () => {
      nock(WHISPER_URL).post('/inference').reply(200, { text: 'Je veux parler de cuisine.' });

      await service.transcribe(fakeAudio);

      expect(logInfo).not.toHaveBeenCalled();
    });
  });
});

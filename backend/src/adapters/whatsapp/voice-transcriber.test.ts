import { WhatsAppVoiceTranscriber } from './voice-transcriber';
import { ServiceUnavailableError } from '../../domain/errors';

const mockMediaDownloader = { download: jest.fn() };
const mockAudioTranscriber = { transcribe: jest.fn() };

const transcriber = new WhatsAppVoiceTranscriber(mockMediaDownloader, mockAudioTranscriber);

describe('WhatsAppVoiceTranscriber', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns transcribed text for the given media ID', async () => {
    const audioBuffer = Buffer.from('ogg-data');
    mockMediaDownloader.download.mockResolvedValue(audioBuffer);
    mockAudioTranscriber.transcribe.mockResolvedValue('Bonjour !');

    const result = await transcriber.transcribe('media-id-123');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('Bonjour !');
    expect(mockMediaDownloader.download).toHaveBeenCalledWith('media-id-123');
    expect(mockAudioTranscriber.transcribe).toHaveBeenCalledWith(audioBuffer);
  });

  it('returns error when audio retrieval fails', async () => {
    mockMediaDownloader.download.mockRejectedValue(new Error('Meta API error 401'));

    const result = await transcriber.transcribe('media-id-123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Meta API error 401');
    expect(mockAudioTranscriber.transcribe).not.toHaveBeenCalled();
  });

  it('returns error when transcription fails', async () => {
    mockMediaDownloader.download.mockResolvedValue(Buffer.from('ogg-data'));
    mockAudioTranscriber.transcribe.mockRejectedValue(new ServiceUnavailableError('whisper down'));

    const result = await transcriber.transcribe('media-id-123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('whisper down');
  });
});

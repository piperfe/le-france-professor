import { okAsync, errAsync } from 'neverthrow';
import { HandleWhatsAppVoiceUseCase } from './handle-whatsapp-voice-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

const mockMediaDownloader = { download: jest.fn() };
const mockAudioTranscriber = { transcribe: jest.fn() };
const mockHandleWhatsAppMessageUseCase = { execute: jest.fn() };

describe('HandleWhatsAppVoiceUseCase', () => {
  let useCase: HandleWhatsAppVoiceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new HandleWhatsAppVoiceUseCase(
      mockMediaDownloader,
      mockAudioTranscriber,
      mockHandleWhatsAppMessageUseCase as any,
    );
  });

  it('downloads, transcribes, and delegates to the text use case', async () => {
    const audioBuffer = Buffer.from('ogg-data');
    mockMediaDownloader.download.mockResolvedValue(audioBuffer);
    mockAudioTranscriber.transcribe.mockResolvedValue('Bonjour !');
    mockHandleWhatsAppMessageUseCase.execute.mockReturnValue(okAsync(undefined));

    const result = await useCase.execute('+56967022669', 'media-id-123');

    expect(result.isOk()).toBe(true);
    expect(mockMediaDownloader.download).toHaveBeenCalledWith('media-id-123');
    expect(mockAudioTranscriber.transcribe).toHaveBeenCalledWith(audioBuffer);
    expect(mockHandleWhatsAppMessageUseCase.execute).toHaveBeenCalledWith('+56967022669', 'Bonjour !');
  });

  it('returns ServiceUnavailableError when media download fails', async () => {
    mockMediaDownloader.download.mockRejectedValue(new Error('Meta API error 401'));

    const result = await useCase.execute('+56967022669', 'media-id-123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Meta API error 401');
    expect(mockAudioTranscriber.transcribe).not.toHaveBeenCalled();
    expect(mockHandleWhatsAppMessageUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns ServiceUnavailableError when transcription fails', async () => {
    mockMediaDownloader.download.mockResolvedValue(Buffer.from('ogg-data'));
    mockAudioTranscriber.transcribe.mockRejectedValue(new ServiceUnavailableError('whisper down'));

    const result = await useCase.execute('+56967022669', 'media-id-123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('whisper down');
    expect(mockHandleWhatsAppMessageUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns ServiceUnavailableError when the text use case fails', async () => {
    mockMediaDownloader.download.mockResolvedValue(Buffer.from('ogg-data'));
    mockAudioTranscriber.transcribe.mockResolvedValue('Bonjour !');
    mockHandleWhatsAppMessageUseCase.execute.mockReturnValue(
      errAsync(new ServiceUnavailableError('LLM down')),
    );

    const result = await useCase.execute('+56967022669', 'media-id-123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('LLM down');
  });
});

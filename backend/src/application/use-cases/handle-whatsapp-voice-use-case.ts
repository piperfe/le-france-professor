import { ResultAsync } from 'neverthrow';
import type { MediaDownloader } from '../../domain/services/media-downloader';
import type { AudioTranscriber } from '../../domain/services/audio-transcriber';
import type { HandleWhatsAppMessageUseCase } from './handle-whatsapp-message-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

export class HandleWhatsAppVoiceUseCase {
  constructor(
    private readonly mediaDownloader: MediaDownloader,
    private readonly audioTranscriber: AudioTranscriber,
    private readonly handleWhatsAppMessageUseCase: HandleWhatsAppMessageUseCase,
  ) {}

  execute(phone: string, mediaId: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.mediaDownloader.download(mediaId),
      (e) => new ServiceUnavailableError(e instanceof Error ? e.message : 'Failed to download audio'),
    )
      .andThen((audio) =>
        ResultAsync.fromPromise(
          this.audioTranscriber.transcribe(audio),
          (e) => new ServiceUnavailableError(e instanceof Error ? e.message : 'Failed to transcribe audio'),
        ),
      )
      .andThen((text) => this.handleWhatsAppMessageUseCase.execute(phone, text));
  }
}

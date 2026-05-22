import { ResultAsync } from 'neverthrow';
import type { MediaDownloader } from './ports/media-downloader';
import type { AudioTranscriber } from './ports/audio-transcriber';
import { ServiceUnavailableError } from '../../domain/errors';

export class WhatsAppVoiceTranscriber {
  constructor(
    private readonly mediaDownloader: MediaDownloader,
    private readonly audioTranscriber: AudioTranscriber,
  ) {}

  transcribe(mediaId: string): ResultAsync<string, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.mediaDownloader.download(mediaId),
      (e) => new ServiceUnavailableError(e instanceof Error ? e.message : 'Failed to download audio'),
    ).andThen((audio) =>
      ResultAsync.fromPromise(
        this.audioTranscriber.transcribe(audio),
        (e) => new ServiceUnavailableError(e instanceof Error ? e.message : 'Failed to transcribe audio'),
      ),
    );
  }
}

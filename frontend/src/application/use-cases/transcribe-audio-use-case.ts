import { ResultAsync } from 'neverthrow'
import type { TranscriptionRepository } from '../../domain/repositories/transcription-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class TranscribeAudioUseCase {
  constructor(private repository: TranscriptionRepository) {}

  execute(audio: Blob): ResultAsync<{ text: string }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.transcribe(audio),
      (e) => e instanceof ServiceUnavailableError ? e : new ServiceUnavailableError((e as Error).message),
    )
  }
}

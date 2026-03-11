import { ResultAsync } from 'neverthrow'
import type { TtsRepository } from '../../domain/repositories/tts-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class SynthesizeSpeechUseCase {
  constructor(private repository: TtsRepository) {}

  execute(text: string, lengthScale?: number): ResultAsync<{ audio: Blob }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.synthesize(text, lengthScale),
      (e) => e instanceof ServiceUnavailableError ? e : new ServiceUnavailableError((e as Error).message),
    )
  }
}

import { ResultAsync } from 'neverthrow'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import type { VocabularyEntry } from '../../domain/entities/vocabulary-entry'
import { ServiceUnavailableError } from '../../domain/errors'

export class GetVocabularyUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(conversationId: string): ResultAsync<VocabularyEntry[], ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.getVocabulary(conversationId),
      (e) =>
        e instanceof ServiceUnavailableError
          ? e
          : new ServiceUnavailableError((e as Error).message),
    )
  }
}

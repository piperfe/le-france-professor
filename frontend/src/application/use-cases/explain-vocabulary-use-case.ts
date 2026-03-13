import { ResultAsync } from 'neverthrow'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class ExplainVocabularyUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(
    conversationId: string,
    word: string,
    context: string,
  ): ResultAsync<{ explanation: string }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.explainVocabulary(conversationId, word, context),
      (e) =>
        e instanceof ServiceUnavailableError
          ? e
          : new ServiceUnavailableError((e as Error).message),
    )
  }
}

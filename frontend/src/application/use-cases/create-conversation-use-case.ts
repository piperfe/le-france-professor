import { ResultAsync } from 'neverthrow'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class CreateConversationUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(): ResultAsync<{ conversationId: string; initialMessage: string }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.create(),
      (e) => e instanceof ServiceUnavailableError ? e : new ServiceUnavailableError((e as Error).message),
    )
  }
}

import { ResultAsync } from 'neverthrow'
import type { Conversation } from '../../domain/entities/conversation'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors'

export class GetConversationUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(conversationId: string): ResultAsync<Conversation, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.getById(conversationId),
      (e) => e instanceof NotFoundError || e instanceof ServiceUnavailableError
      ? e
      : new ServiceUnavailableError((e as Error).message),
    )
  }
}

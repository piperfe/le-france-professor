import { ResultAsync } from 'neverthrow'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class SendMessageUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(
    conversationId: string,
    message: string,
  ): ResultAsync<{ tutorResponse: string; messageId: string }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.sendMessage(conversationId, message).then((r) => ({ tutorResponse: r.tutorResponse, messageId: r.messageId })),
      (e) => e instanceof ServiceUnavailableError ? e : new ServiceUnavailableError((e as Error).message),
    )
  }
}

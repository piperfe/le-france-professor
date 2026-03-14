import { ResultAsync } from 'neverthrow'
import type { ConversationRepository, ConversationSummary } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class GetAllConversationsUseCase {
  constructor(private repository: ConversationRepository) {}

  execute(): ResultAsync<ConversationSummary[], ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.findAll(),
      (e) =>
        e instanceof ServiceUnavailableError
          ? e
          : new ServiceUnavailableError((e as Error).message),
    )
  }
}

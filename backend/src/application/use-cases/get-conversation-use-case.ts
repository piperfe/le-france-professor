import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

type ConversationDTO = {
  id: string;
  messages: Array<{
    id: string;
    content: string;
    sender: string;
    timestamp: Date;
  }>;
  createdAt: Date;
};

export class GetConversationUseCase {
  constructor(private conversationRepository: ConversationRepository) {}

  @Span()
  execute(
    conversationId: string,
  ): ResultAsync<ConversationDTO, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.findById(conversationId),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Repository unavailable',
        ),
    ).andThen((conversation) => {
      if (!conversation) {
        return errAsync(new NotFoundError('Conversation not found'));
      }

      return okAsync({
        id: conversation.id,
        messages: conversation.getMessages().map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp,
        })),
        createdAt: conversation.createdAt,
      });
    });
  }
}

import { ResultAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { ServiceUnavailableError } from '../../domain/errors';

type ConversationSummaryDTO = {
  id: string;
  title: string;
  createdAt: Date;
};

export class GetAllConversationsUseCase {
  constructor(private conversationRepository: ConversationRepository) {}

  @Span()
  execute(): ResultAsync<ConversationSummaryDTO[], ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.findAll(),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Repository unavailable',
        ),
    ).map((conversations) =>
      conversations.map((conv) => {
        const firstTutorMessage = conv.getMessages().find((m) => m.sender === 'tutor');
        const title = firstTutorMessage
          ? firstTutorMessage.content.slice(0, 40).trimEnd() +
            (firstTutorMessage.content.length > 40 ? '…' : '')
          : 'Nouvelle conversation';
        return { id: conv.id, title, createdAt: conv.createdAt };
      }),
    );
  }
}

import { ResultAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { ServiceUnavailableError } from '../../domain/errors';

function formatFallbackTitle(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `Nouvelle conversation ${dd}/${mm} ${hh}:${min}`;
}

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
        const title = conv.title ?? formatFallbackTitle(conv.createdAt);
        return { id: conv.id, title, createdAt: conv.createdAt };
      }),
    );
  }
}

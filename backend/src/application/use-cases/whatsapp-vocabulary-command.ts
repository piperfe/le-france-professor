import { ResultAsync } from 'neverthrow';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';
import type { ExplainVocabularyInConversationUseCase } from './explain-vocabulary-in-conversation-use-case';
import { ServiceUnavailableError } from '../../domain/errors';
import type { WhatsAppCommand } from './handle-whatsapp-message-use-case';

export class VocabularyWhatsAppCommand implements WhatsAppCommand {
  readonly regex = /^\/vocabulary\s+(.+)$/i;

  constructor(
    private readonly explainVocabularyInConversationUseCase: ExplainVocabularyInConversationUseCase,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  execute(phone: string, conversationId: string, match: RegExpMatchArray): ResultAsync<void, ServiceUnavailableError> {
    return this.explainVocabularyInConversationUseCase
      .execute(conversationId, match[1].trim())
      .andThen((explanation) =>
        ResultAsync.fromPromise(
          this.whatsAppSender.sendMessage(phone, explanation),
          (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
        ),
      );
  }
}

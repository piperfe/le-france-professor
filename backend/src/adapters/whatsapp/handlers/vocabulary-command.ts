import { ResultAsync } from 'neverthrow';
import type { WhatsAppCommand } from './whatsapp-command';
import type { ExplainVocabularyInConversationUseCase } from '../../../application/use-cases/explain-vocabulary-in-conversation-use-case';
import type { WhatsAppSender } from '../ports/whatsapp-sender';
import { ServiceUnavailableError } from '../../../domain/errors';

// TODO: extract input parsing to a dedicated schema when this command grows multiple fields or error cases

const MISSING_WORD_REPLY = 'Indiquez un mot à expliquer. Exemple : /vocabulary bonjour';

export class VocabularyCommand implements WhatsAppCommand {
  readonly trigger = /^\/vocabulary/i;
  readonly pattern = /^\/vocabulary\s+(.*\S)/i;
  readonly usage = '/vocabulary [mot]';

  constructor(
    private readonly explainVocabularyInConversationUseCase: ExplainVocabularyInConversationUseCase,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  execute(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    const match = this.pattern.exec(text);
    if (!match) return this.reply(phone, MISSING_WORD_REPLY);
    return this.explainVocabularyInConversationUseCase
      .execute(conversationId, match[1].trim())
      .andThen((explanation) => this.reply(phone, explanation));
  }

  private reply(phone: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.whatsAppSender.sendMessage(phone, body),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
    );
  }
}

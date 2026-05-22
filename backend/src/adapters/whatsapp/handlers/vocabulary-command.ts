import { ResultAsync } from 'neverthrow';
import type { WhatsAppCommand } from './whatsapp-command';
import type { ExplainVocabularyInConversationUseCase } from '../../../application/use-cases/explain-vocabulary-in-conversation-use-case';
import type { VocabularyFormatter } from '../ports/vocabulary-formatter';
import type { WhatsAppSender } from '../ports/whatsapp-sender';
import { ServiceUnavailableError } from '../../../domain/errors';

// TODO: extract input parsing to a dedicated schema when this command grows multiple fields or error cases

export class VocabularyCommand implements WhatsAppCommand {
  readonly trigger = /^\/vocabulary/i;
  readonly pattern = /^\/vocabulary\s+(.*\S)/i;
  readonly usage = '/vocabulary [mot]';

  constructor(
    private readonly explainVocabularyInConversationUseCase: ExplainVocabularyInConversationUseCase,
    private readonly vocabularyFormatter: VocabularyFormatter,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  execute(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    const match = this.pattern.exec(text);
    if (!match) return this.reply(phone, this.vocabularyFormatter.formatMissingWord());
    const word = match[1].trim();
    return this.explainVocabularyInConversationUseCase
      .execute(conversationId, word)
      .andThen((explanation) => this.reply(phone, this.vocabularyFormatter.formatReply(word, explanation)));
  }

  private reply(phone: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.whatsAppSender.sendMessage(phone, body),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
    );
  }
}

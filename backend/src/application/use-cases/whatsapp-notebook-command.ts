import { ResultAsync } from 'neverthrow';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';
import type { GetVocabularyUseCase } from './get-vocabulary-use-case';
import type { NotebookFormatter } from '../../domain/services/notebook-formatter';
import { ServiceUnavailableError } from '../../domain/errors';
import type { WhatsAppCommand } from './handle-whatsapp-message-use-case';

export class NotebookWhatsAppCommand implements WhatsAppCommand {
  readonly regex = /^\/notebook(\s+all)?$/i;

  constructor(
    private readonly getVocabularyUseCase: GetVocabularyUseCase,
    private readonly notebookFormatter: NotebookFormatter,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  execute(phone: string, conversationId: string, match: RegExpMatchArray): ResultAsync<void, ServiceUnavailableError> {
    const showAll = match[1]?.trim() === 'all';
    return this.getVocabularyUseCase.execute(conversationId).andThen((entries) => {
      const text = this.notebookFormatter.formatReply(entries, showAll);
      if (entries.length === 0) {
        return this.sendText(phone, text);
      }
      const filename = `carnet-vocabulaire-${new Date().toISOString().slice(0, 10)}.pdf`;
      return ResultAsync.fromPromise(
        this.notebookFormatter.generatePdf(entries),
        (err) => new ServiceUnavailableError(err instanceof Error ? err.message : 'PDF generation failed'),
      ).andThen((pdf) =>
        this.sendText(phone, text).andThen(() =>
          ResultAsync.fromPromise(
            this.whatsAppSender.sendDocument(phone, pdf, filename),
            (err) => new ServiceUnavailableError(err instanceof Error ? err.message : 'Failed to send PDF'),
          ),
        ),
      );
    });
  }

  private sendText(phone: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.whatsAppSender.sendMessage(phone, body),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
    );
  }
}

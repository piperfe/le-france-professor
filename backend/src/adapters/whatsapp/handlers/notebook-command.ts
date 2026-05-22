import { ResultAsync } from 'neverthrow';
import type { WhatsAppCommand } from './whatsapp-command';
import type { GetVocabularyUseCase } from '../../../application/use-cases/get-vocabulary-use-case';
import type { NotebookFormatter } from '../ports/notebook-formatter';
import type { WhatsAppSender } from '../ports/whatsapp-sender';
import { ServiceUnavailableError } from '../../../domain/errors';

// TODO: extract input parsing to a dedicated schema when this command grows multiple fields or error cases

export class NotebookCommand implements WhatsAppCommand {
  readonly trigger = /^\/notebook/i;
  readonly pattern = /^\/notebook(\s+all)?$/i;
  readonly usage = '/notebook · /notebook all';

  constructor(
    private readonly getVocabularyUseCase: GetVocabularyUseCase,
    private readonly notebookFormatter: NotebookFormatter,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  execute(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    const match = this.pattern.exec(text);
    if (!match) return this.sendText(phone, this.notebookFormatter.formatInvalidUsage());

    const showAll = match[1]?.trim() === 'all';
    return this.getVocabularyUseCase.execute(conversationId).andThen((entries) => {
      const reply = this.notebookFormatter.formatReply(entries, showAll);
      if (entries.length === 0) {
        return this.sendText(phone, reply);
      }
      const filename = `carnet-vocabulaire-${new Date().toISOString().slice(0, 10)}.pdf`;
      return ResultAsync.fromPromise(
        this.notebookFormatter.generatePdf(entries),
        (err) => new ServiceUnavailableError(err instanceof Error ? err.message : 'PDF generation failed'),
      ).andThen((pdf) =>
        this.sendText(phone, reply).andThen(() =>
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

import type { VocabularyEntry } from '../../../domain/entities/vocabulary-entry';

export interface NotebookFormatter {
  formatReply(entries: VocabularyEntry[], showAll: boolean): string;
  formatInvalidUsage(): string;
  generatePdf(entries: VocabularyEntry[]): Promise<Buffer>;
}

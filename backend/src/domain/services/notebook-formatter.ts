import type { VocabularyEntry } from '../entities/vocabulary-entry';

export interface NotebookFormatter {
  formatReply(entries: VocabularyEntry[], showAll: boolean): string;
  generatePdf(entries: VocabularyEntry[]): Promise<Buffer>;
}

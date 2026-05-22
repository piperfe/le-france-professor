export interface VocabularyFormatter {
  formatReply(word: string, explanation: string): string;
  formatMissingWord(): string;
}

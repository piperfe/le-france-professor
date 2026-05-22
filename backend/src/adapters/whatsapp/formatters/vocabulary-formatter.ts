import type { VocabularyFormatter } from '../ports/vocabulary-formatter';

export class WhatsAppVocabularyFormatter implements VocabularyFormatter {
  formatReply(word: string, explanation: string): string {
    return `📚 *${word}* 🇫🇷\n\n${explanation}`;
  }

  formatMissingWord(): string {
    return `📚 *Utilisation*, indique un mot à expliquer *:*\n• /vocabulary bonjour\n• /vocabulary se passer`;
  }
}

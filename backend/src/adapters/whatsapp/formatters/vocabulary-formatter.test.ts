import { WhatsAppVocabularyFormatter } from './vocabulary-formatter';

const formatter = new WhatsAppVocabularyFormatter();

describe('WhatsAppVocabularyFormatter', () => {
  describe('formatReply', () => {
    it('golden path — full formatted output', () => {
      expect(formatter.formatReply('bonjour', 'Salutation française.')).toBe(
        '📚 *bonjour* 🇫🇷\n\nSalutation française.',
      );
    });

    describe('content — data correctness', () => {
      it('includes the word', () => {
        expect(formatter.formatReply('bonjour', 'Salutation.')).toContain('bonjour');
      });

      it('includes the explanation', () => {
        expect(formatter.formatReply('bonjour', 'Salutation française.')).toContain('Salutation française.');
      });

      it('places the word before the explanation', () => {
        const result = formatter.formatReply('bonjour', 'Salutation.');
        expect(result.indexOf('bonjour')).toBeLessThan(result.indexOf('Salutation.'));
      });

      it('handles a multi-word phrase', () => {
        expect(formatter.formatReply('se passer', 'Se produire.')).toContain('se passer');
      });
    });

    describe('format — WhatsApp markers', () => {
      it('wraps the word in bold markers', () => {
        expect(formatter.formatReply('bonjour', 'Salutation.')).toContain('*bonjour*');
      });

      it('includes the French flag emoji', () => {
        expect(formatter.formatReply('bonjour', 'Salutation.')).toContain('🇫🇷');
      });

      it('includes the book emoji', () => {
        expect(formatter.formatReply('bonjour', 'Salutation.')).toContain('📚');
      });
    });
  });

  describe('formatMissingWord', () => {
    it('golden path — full formatted output', () => {
      expect(formatter.formatMissingWord()).toBe(
        '📚 *Utilisation*, indique un mot à expliquer *:*\n• /vocabulary bonjour\n• /vocabulary se passer',
      );
    });

    describe('content — data correctness', () => {
      it('includes the utilisation label', () => {
        expect(formatter.formatMissingWord()).toContain('Utilisation');
      });

      it('includes usage examples', () => {
        expect(formatter.formatMissingWord()).toContain('/vocabulary bonjour');
        expect(formatter.formatMissingWord()).toContain('/vocabulary se passer');
      });
    });

    describe('format — WhatsApp markers', () => {
      it('includes the book emoji', () => {
        expect(formatter.formatMissingWord()).toContain('📚');
      });

      it('uses bullet list for usage examples', () => {
        expect(formatter.formatMissingWord()).toContain('• /vocabulary');
      });
    });
  });
});

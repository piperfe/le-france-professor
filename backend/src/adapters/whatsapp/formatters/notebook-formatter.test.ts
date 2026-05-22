import { PDFParse } from 'pdf-parse';
import { WhatsAppNotebookFormatter } from './notebook-formatter';
import { VocabularyEntry } from '../../../domain/entities/vocabulary-entry';

const makeEntry = (word: string, explanation: string, daysAgo = 0) =>
  new VocabularyEntry(
    `id-${word}`, word, explanation, 'msg-1', 'conv-1',
    new Date(Date.now() - daysAgo * 86_400_000),
  );

async function parsePdf(buffer: Buffer) {
  return new PDFParse({ data: buffer }).getText();
}

const formatter = new WhatsAppNotebookFormatter();

// ─────────────────────────────────────────────────────────────────────────────
// formatReply
// ─────────────────────────────────────────────────────────────────────────────

describe('WhatsAppNotebookFormatter.formatReply', () => {
  it('golden path — single entry, today', () => {
    const today = new Date();
    const time = today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const entry = makeEntry('bonjour', 'Salutation française courante.', 0);
    const result = formatter.formatReply([entry], false);
    expect(result).toBe(
      `📖 *Vocabulaire* 🇫🇷 — 1 mot au total\n\n*bonjour*\nSalutation française courante.\n_Aujourd'hui, ${time}_`,
    );
  });


  describe('structure — WhatsApp format markers', () => {
    it('wraps the header word in bold markers with flag emoji', () => {
      expect(formatter.formatReply([], false)).toContain('📖 *Vocabulaire* 🇫🇷');
    });

    it('wraps each entry word in bold markers on its own line', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.')], false);
      expect(result.split('\n')).toContain('*bonjour*');
    });

    it('wraps the entry date in italic markers', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.')], false);
      const lines = result.split('\n');
      const explanationIdx = lines.findIndex((l) => l === 'Salutation.');
      expect(lines[explanationIdx + 1]).toMatch(/^_.*_$/);
    });

    it('places ▫️ separator between consecutive entries', () => {
      const result = formatter.formatReply([makeEntry('a', 'A.'), makeEntry('b', 'B.')], false);
      const lines = result.split('\n');
      const aIdx = lines.indexOf('*a*');
      const bIdx = lines.indexOf('*b*');
      expect(lines.slice(aIdx, bIdx)).toContain('▫️');
    });

    it('does not place ▫️ after the last entry', () => {
      const result = formatter.formatReply([makeEntry('a', 'A.'), makeEntry('b', 'B.')], false);
      const lines = result.split('\n');
      const bIdx = lines.indexOf('*b*');
      expect(lines.slice(bIdx)).not.toContain('▫️');
    });

    it('wraps the remainder hint in italic markers', () => {
      const entries = Array.from({ length: 8 }, (_, i) => makeEntry(`mot-${i}`, `Exp ${i}.`));
      const result = formatter.formatReply(entries, false);
      expect(result).toContain('_+ 3 mots · /notebook all pour tout voir_');
    });

    it('wraps the empty-notebook message in italic markers', () => {
      const result = formatter.formatReply([], false);
      expect(result).toMatch(/_Aucun mot/);
    });
  });

  describe('content — data correctness', () => {
    it('shows the vocabulary word', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.')], false);
      expect(result).toContain('bonjour');
    });

    it('shows the explanation text', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation française.')], false);
      expect(result).toContain('Salutation française.');
    });

    it('shows the total entry count in the header', () => {
      const entries = [makeEntry('a', 'A.'), makeEntry('b', 'B.'), makeEntry('c', 'C.')];
      expect(formatter.formatReply(entries, false)).toContain('3 mots au total');
    });

    it('includes /vocabulary hint in the empty-notebook message', () => {
      expect(formatter.formatReply([], false)).toContain('/vocabulary [mot]');
    });

    it('includes /notebook all in the remainder hint when entries exceed the limit', () => {
      const entries = Array.from({ length: 8 }, (_, i) => makeEntry(`m-${i}`, `E ${i}.`));
      expect(formatter.formatReply(entries, false)).toContain('/notebook all');
    });

    it('does not include /notebook all when entries are within the limit', () => {
      expect(formatter.formatReply([makeEntry('bon', 'Bien.')], false)).not.toContain('/notebook all');
    });

    it('uses relative date for today\'s entry', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.', 0)], false);
      expect(result).toContain("Aujourd'hui");
    });

    it('uses relative date for yesterday\'s entry', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.', 1)], false);
      expect(result).toContain('Hier');
    });

    it('uses relative date for older entries', () => {
      const result = formatter.formatReply([makeEntry('bonjour', 'Salutation.', 3)], false);
      expect(result).toContain('Il y a 3 jours');
    });
  });

  describe('style — presentation decisions', () => {
    it('uses singular form for 1 entry in the header', () => {
      const result = formatter.formatReply([makeEntry('bon', 'Bien.')], false);
      expect(result).toContain('1 mot au total');
      expect(result).not.toContain('1 mots');
    });

    it('uses singular form when exactly 1 entry remains', () => {
      const sixEntries = Array.from({ length: 6 }, (_, i) => makeEntry(`w-${i}`, `E.`));
      const result = formatter.formatReply(sixEntries, false);
      expect(result).toContain('+ 1 mot ·');
      expect(result).not.toContain('+ 1 mots');
    });

    it('shows exactly 5 entries when over the limit', () => {
      const entries = Array.from({ length: 8 }, (_, i) => makeEntry(`mot-${i}`, `Exp ${i}.`));
      const result = formatter.formatReply(entries, false);
      const boldWords = result.split('\n').filter((l) => /^\*[^*]+\*$/.test(l)).length;
      expect(boldWords).toBe(5);
    });

    it('shows the 5 most recent entries, excluding the oldest', () => {
      const entries = Array.from({ length: 8 }, (_, i) => makeEntry(`mot-${i}`, `Exp ${i}.`));
      const result = formatter.formatReply(entries, false);
      expect(result).not.toContain('*mot-0*');
      expect(result).not.toContain('*mot-2*');
      expect(result).toContain('*mot-3*');
      expect(result).toContain('*mot-7*');
    });

    it('shows all entries when showAll is true, including the oldest', () => {
      const entries = Array.from({ length: 8 }, (_, i) => makeEntry(`mot-${i}`, `Exp ${i}.`));
      const result = formatter.formatReply(entries, true);
      expect(result).toContain('*mot-0*');
      expect(result).toContain('*mot-7*');
      expect(result).not.toContain('/notebook all');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatInvalidUsage
// ─────────────────────────────────────────────────────────────────────────────

describe('WhatsAppNotebookFormatter.formatInvalidUsage', () => {
  it('golden path — full formatted output', () => {
    expect(formatter.formatInvalidUsage()).toBe('📖 *Utilisation :*\n• /notebook\n• /notebook all');
  });

  describe('content — data correctness', () => {
    it('includes the utilisation label', () => {
      expect(formatter.formatInvalidUsage()).toContain('Utilisation');
    });

    it('includes /notebook command', () => {
      expect(formatter.formatInvalidUsage()).toContain('/notebook');
    });

    it('includes /notebook all variant', () => {
      expect(formatter.formatInvalidUsage()).toContain('/notebook all');
    });
  });

  describe('format — WhatsApp markers', () => {
    it('includes the notebook emoji', () => {
      expect(formatter.formatInvalidUsage()).toContain('📖');
    });

    it('uses bullet list for usage variants', () => {
      expect(formatter.formatInvalidUsage()).toContain('• /notebook');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generatePdf
// ─────────────────────────────────────────────────────────────────────────────

describe('WhatsAppNotebookFormatter.generatePdf', () => {
  describe('structure — PDF binary markers', () => {
    it('starts with the PDF magic header', async () => {
      const buffer = await formatter.generatePdf([makeEntry('bonjour', 'Salutation.')]);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('contains the PDF EOF marker', async () => {
      const buffer = await formatter.generatePdf([makeEntry('bonjour', 'Salutation.')]);
      expect(buffer.toString('latin1')).toContain('%%EOF');
    });

    it('produces a valid PDF structure even for an empty entry list', async () => {
      const buffer = await formatter.generatePdf([]);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
      expect(buffer.toString('latin1')).toContain('%%EOF');
    });
  });

  describe('content — rendered text', () => {
    it('contains the app branding', async () => {
      const { text } = await parsePdf(await formatter.generatePdf([]));
      expect(text).toContain('Le France Professor');
      expect(text).toContain('Carnet de Vocabulaire');
    });

    it('renders each vocabulary word', async () => {
      const buffer = await formatter.generatePdf([
        makeEntry('incontournable', 'Essentiel.'),
        makeEntry('épanouir', 'Se développer.'),
      ]);
      const { text } = await parsePdf(buffer);
      expect(text).toContain('incontournable');
      expect(text).toContain('épanouir');
    });

    it('renders each vocabulary explanation', async () => {
      const buffer = await formatter.generatePdf([
        makeEntry('bonjour', 'Salutation française courante.'),
      ]);
      const { text } = await parsePdf(buffer);
      expect(text).toContain('Salutation française courante.');
    });

    it('includes the entry count', async () => {
      const buffer = await formatter.generatePdf([
        makeEntry('a', 'A.'), makeEntry('b', 'B.'),
      ]);
      const { text } = await parsePdf(buffer);
      expect(text).toContain('2 mots');
    });

    it('contains the footer branding', async () => {
      const { text } = await parsePdf(await formatter.generatePdf([]));
      expect(text).toContain('Page 1 sur 1');
    });
  });

  describe('style — layout and typography', () => {
    it('renders each word before its explanation', async () => {
      const buffer = await formatter.generatePdf([
        makeEntry('incontournable', 'Essentiel, qu\'on ne peut pas éviter.'),
      ]);
      const { text } = await parsePdf(buffer);
      expect(text.indexOf('incontournable')).toBeLessThan(text.indexOf('Essentiel'));
    });

    it('fits a short notebook on a single page', async () => {
      const buffer = await formatter.generatePdf([
        makeEntry('a', 'Alpha.'), makeEntry('b', 'Beta.'),
      ]);
      const { pages } = await parsePdf(buffer);
      expect(pages.length).toBe(1);
    });

    it('uses a bold font in the PDF source', async () => {
      const buffer = await formatter.generatePdf([makeEntry('bonjour', 'Salutation.')]);
      expect(buffer.toString('latin1')).toContain('Helvetica-Bold');
    });
  });
});

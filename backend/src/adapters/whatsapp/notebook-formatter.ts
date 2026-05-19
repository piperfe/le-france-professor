import PDFDocument from 'pdfkit';
import type { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import type { NotebookFormatter } from '../../domain/services/notebook-formatter';

const NOTEBOOK_LIMIT = 5;
const ENTRY_SEPARATOR = '▫️';

const HEADER_HEIGHT  = 60;
const SECTION_BAND_H = 32;
const WHITE_STRIPE_W = 14;
const RED_STRIPE_W   = 18;
const HEADER_R       = 8;
const HEADER_K       = 0.9;  // bezier kappa — softer than a pure quarter-circle

const CARD_BORDER = 3;
const CARD_PAD_V  = 10;
const CARD_PAD_H  = 12;
const CARD_RADIUS = 8;
const CARD_GAP    = 8;

// pdfkit built-in fonts — no external files needed
const F_DISPLAY = 'Helvetica-Bold';
const F_BODY    = 'Helvetica';

type Doc = InstanceType<typeof PDFDocument>;

export class WhatsAppNotebookFormatter implements NotebookFormatter {
  formatReply(entries: VocabularyEntry[], showAll: boolean): string {
    const count = entries.length;
    const header = `📖 *Vocabulaire* 🇫🇷 — ${count} mot${count !== 1 ? 's' : ''} au total`;

    if (count === 0) {
      return `${header}\n\n_Aucun mot enregistré pour l'instant.\nUtilise /vocabulary [mot] pendant la conversation._`;
    }

    const toShow = showAll ? entries : entries.slice(-NOTEBOOK_LIMIT);
    const remaining = count - toShow.length;
    const lines: string[] = [header, ''];

    for (let i = 0; i < toShow.length; i++) {
      const entry = toShow[i];
      lines.push(`*${entry.word}*`);
      lines.push(entry.explanation);
      lines.push(`_${formatRelativeDate(entry.createdAt)}_`);
      if (i < toShow.length - 1) {
        lines.push(ENTRY_SEPARATOR);
      }
    }

    lines.push('');

    if (remaining > 0) {
      lines.push(`_+ ${remaining} mot${remaining !== 1 ? 's' : ''} · /notebook all pour tout voir_`);
    }

    return lines.join('\n').trimEnd();
  }

  generatePdf(entries: VocabularyEntry[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;

      this.drawHeader(doc, pageW);
      this.drawSectionBand(doc, pageW, entries.length);
      doc.y = HEADER_HEIGHT + SECTION_BAND_H + 10;
      this.drawEntries(doc, pageW, entries);
      this.drawFooters(doc, pageW, pageH);

      doc.flushPages();
      doc.end();
    });
  }

  private drawHeader(doc: Doc, pageW: number): void {
    const r = HEADER_R;
    const K = HEADER_K;

    doc.save();
    doc.moveTo(0, 0)
      .lineTo(pageW - r, 0)
      .bezierCurveTo(pageW - r + r * K, 0, pageW, r - r * K, pageW, r)
      .lineTo(pageW, HEADER_HEIGHT)
      .lineTo(0, HEADER_HEIGHT)
      .closePath()
      .fill('#002395');
    doc.restore();

    // White stripe — plain rect sits fully inside the blue area
    doc.save();
    doc.rect(pageW - RED_STRIPE_W - WHITE_STRIPE_W, 0, WHITE_STRIPE_W, HEADER_HEIGHT).fill('#FFFFFF');
    doc.restore();

    // Red stripe — shares the same top-right bezier as the blue band
    doc.save();
    doc.moveTo(pageW - RED_STRIPE_W, 0)
      .lineTo(pageW - r, 0)
      .bezierCurveTo(pageW - r + r * K, 0, pageW, r - r * K, pageW, r)
      .lineTo(pageW, HEADER_HEIGHT)
      .lineTo(pageW - RED_STRIPE_W, HEADER_HEIGHT)
      .closePath()
      .fill('#ED2939');
    doc.restore();

    doc.fontSize(18).font(F_DISPLAY).fillColor('#FFFFFF')
      .text('Le France Professor', 50, 14, { lineBreak: false });

    const exportDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.fontSize(9).font(F_BODY).fillColor('#99B4E8')
      .text(`Carnet de Vocabulaire  ·  Exporté le ${exportDate}`, 50, 38, { lineBreak: false });
  }

  private drawSectionBand(doc: Doc, pageW: number, entryCount: number): void {
    doc.save();
    doc.rect(0, HEADER_HEIGHT, pageW, SECTION_BAND_H).fill('#EEF1F8');
    doc.restore();

    const bandMidY = HEADER_HEIGHT + Math.round((SECTION_BAND_H - 9) / 2);
    doc.fontSize(9).font(F_BODY).fillColor('#8A93B2')
      .text(`${entryCount} mot${entryCount !== 1 ? 's' : ''}`,
        50, bandMidY, { width: pageW - 100, align: 'right', lineBreak: false });

    doc.strokeColor('#D5D8E8').lineWidth(0.5)
      .moveTo(0, HEADER_HEIGHT + SECTION_BAND_H)
      .lineTo(pageW, HEADER_HEIGHT + SECTION_BAND_H).stroke();
  }

  private drawEntries(doc: Doc, pageW: number, entries: VocabularyEntry[]): void {
    const textX = 50 + CARD_BORDER + CARD_PAD_H;
    const textW = pageW - textX - 50 - CARD_PAD_H;

    for (const entry of entries) {
      doc.fontSize(13).font(F_DISPLAY);
      const wordH = doc.currentLineHeight(true);
      doc.fontSize(11).font(F_BODY);
      const expH = doc.heightOfString(entry.explanation, { width: textW });
      doc.fontSize(9).font(F_BODY);
      const dateH = doc.currentLineHeight(true);
      const cardH = CARD_PAD_V + wordH + 3 + expH + 3 + dateH + CARD_PAD_V;

      if (doc.y + cardH > doc.page.maxY()) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
      const y = doc.y;

      doc.save().roundedRect(50, y, pageW - 100, cardH, CARD_RADIUS).fill('#F7F4EF').restore();
      doc.save().rect(50, y, CARD_BORDER, cardH).fill('#5C4A8A').restore();

      doc.fontSize(13).font(F_DISPLAY).fillColor('#5C4A8A')
        .text(entry.word, textX, y + CARD_PAD_V, { width: textW, lineBreak: false });
      doc.fontSize(11).font(F_BODY).fillColor('#1A1714')
        .text(entry.explanation, textX, y + CARD_PAD_V + wordH + 3, { width: textW });
      doc.fontSize(9).font(F_BODY).fillColor('#6B6560')
        .text(formatRelativeDate(entry.createdAt), textX, y + CARD_PAD_V + wordH + 3 + expH + 3, { width: textW, lineBreak: false });

      doc.y = y + cardH + CARD_GAP;
    }
  }

  private drawFooters(doc: Doc, pageW: number, pageH: number): void {
    const { start, count } = doc.bufferedPageRange();
    for (let i = 0; i < count; i++) {
      doc.switchToPage(start + i);
      const pageLabel = count > 1 ? `Page ${i + 1} sur ${count}` : 'Page 1 sur 1';
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.strokeColor('#D8D2C8').lineWidth(0.5)
        .moveTo(50, pageH - 40).lineTo(pageW - 50, pageH - 40).stroke();
      doc.fontSize(8).font(F_BODY).fillColor('#6B6560')
        .text('Le France Professor · Carnet de Vocabulaire', 50, pageH - 30, {
          width: pageW - 100, align: 'left', lineBreak: false,
        });
      doc.text(pageLabel, 50, pageH - 30, {
        width: pageW - 100, align: 'right', lineBreak: false,
      });
      doc.page.margins.bottom = savedBottom;
    }
  }
}

function formatRelativeDate(date: Date, now = new Date()): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEntry = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfEntry.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Aujourd'hui, ${time}`;
  if (diffDays === 1) return `Hier, ${time}`;
  return `Il y a ${diffDays} jours, ${time}`;
}

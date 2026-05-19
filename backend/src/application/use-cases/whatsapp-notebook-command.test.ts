import { okAsync, errAsync } from 'neverthrow';
import { NotebookWhatsAppCommand } from './whatsapp-notebook-command';
import { ServiceUnavailableError } from '../../domain/errors';

const mockGetVocabularyUseCase = { execute: jest.fn() };
const mockNotebookFormatter = { formatReply: jest.fn(), generatePdf: jest.fn() };
const mockWhatsAppSender = { sendMessage: jest.fn(), sendDocument: jest.fn() };

const command = new NotebookWhatsAppCommand(
  mockGetVocabularyUseCase as any,
  mockNotebookFormatter as any,
  mockWhatsAppSender,
);

function matchFor(input: string) {
  return command.regex.exec(input)!;
}

const PHONE = '+10000000001';
const CONV = 'conv-456';
const ENTRY = { word: 'bonjour', explanation: 'Salutation.', createdAt: new Date() };

describe('NotebookWhatsAppCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
    mockWhatsAppSender.sendDocument.mockResolvedValue(undefined);
  });

  describe('regex', () => {
    it('matches /notebook', () => {
      expect(command.regex.test('/notebook')).toBe(true);
    });

    it('matches /notebook all', () => {
      expect(command.regex.test('/notebook all')).toBe(true);
    });

    it('matches case-insensitively (/notebook ALL)', () => {
      expect(command.regex.test('/notebook ALL')).toBe(true);
    });

    it('does not match /notebookfoo (no space separator)', () => {
      expect(command.regex.test('/notebookfoo')).toBe(false);
    });

    it('does not match /notebook all extra (extra tokens)', () => {
      expect(command.regex.test('/notebook all extra')).toBe(false);
    });

    it('does not match /notebook all with trailing space', () => {
      expect(command.regex.test('/notebook all ')).toBe(false);
    });
  });

  it('sends text only when vocabulary is empty', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([]));
    mockNotebookFormatter.formatReply.mockReturnValue('📖 *Vocabulaire* — 0 mots');

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isOk()).toBe(true);
    expect(mockNotebookFormatter.formatReply).toHaveBeenCalledWith([], false);
    expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(PHONE, '📖 *Vocabulaire* — 0 mots');
    expect(mockWhatsAppSender.sendDocument).not.toHaveBeenCalled();
  });

  it('sends text then PDF when vocabulary has entries', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
    mockNotebookFormatter.formatReply.mockReturnValue('📖 *Vocabulaire* — 1 mot');
    mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isOk()).toBe(true);
    expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(PHONE, '📖 *Vocabulaire* — 1 mot');
    expect(mockWhatsAppSender.sendDocument).toHaveBeenCalledWith(
      PHONE,
      Buffer.from('%PDF-1.4'),
      expect.stringMatching(/^carnet-vocabulaire-\d{4}-\d{2}-\d{2}\.pdf$/),
    );
  });

  it('shows all entries when /notebook all', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
    mockNotebookFormatter.formatReply.mockReturnValue('...');
    mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));

    await command.execute(PHONE, CONV, matchFor('/notebook all'));

    expect(mockNotebookFormatter.formatReply).toHaveBeenCalledWith([ENTRY], true);
  });

  it('returns error when vocabulary fetch fails', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB down')));

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('DB down');
    expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
  });

  it('returns error when PDF generation fails', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
    mockNotebookFormatter.formatReply.mockReturnValue('...');
    mockNotebookFormatter.generatePdf.mockRejectedValue(new Error('Out of memory'));

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Out of memory');
    expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
  });

  it('returns error when text send fails', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
    mockNotebookFormatter.formatReply.mockReturnValue('...');
    mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));
    mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    expect(mockWhatsAppSender.sendDocument).not.toHaveBeenCalled();
  });

  it('returns error when PDF send fails', async () => {
    mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
    mockNotebookFormatter.formatReply.mockReturnValue('...');
    mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));
    mockWhatsAppSender.sendDocument.mockRejectedValue(new Error('Upload failed'));

    const result = await command.execute(PHONE, CONV, matchFor('/notebook'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Upload failed');
  });
});

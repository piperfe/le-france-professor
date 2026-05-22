import { okAsync, errAsync } from 'neverthrow';
import { NotebookCommand } from './notebook-command';
import { ServiceUnavailableError } from '../../../domain/errors';

const mockGetVocabularyUseCase = { execute: jest.fn() };
const mockNotebookFormatter = { formatReply: jest.fn(), formatInvalidUsage: jest.fn(), generatePdf: jest.fn() };
const mockWhatsAppSender = { sendMessage: jest.fn(), sendDocument: jest.fn() };

const command = new NotebookCommand(
  mockGetVocabularyUseCase as any,
  mockNotebookFormatter as any,
  mockWhatsAppSender,
);

const PHONE = '+10000000001';
const CONV = 'conv-456';
const ENTRY = { word: 'bonjour', explanation: 'Salutation.', createdAt: new Date() };

describe('NotebookCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
    mockWhatsAppSender.sendDocument.mockResolvedValue(undefined);
    mockNotebookFormatter.formatInvalidUsage.mockReturnValue('📖 *Utilisation :*\n• /notebook\n• /notebook all');
  });

  it('usage string is /notebook · /notebook all', () => {
    expect(command.usage).toBe('/notebook · /notebook all');
  });

  describe('regex', () => {
    describe('trigger', () => {
      it('matches /notebook', () => {
        expect(command.trigger.test('/notebook')).toBe(true);
      });

      it('matches /notebook all', () => {
        expect(command.trigger.test('/notebook all')).toBe(true);
      });

      it('matches /notebookfoo (broad — pattern handles strict validation)', () => {
        expect(command.trigger.test('/notebookfoo')).toBe(true);
      });
    });

    describe('pattern', () => {
      it('matches /notebook', () => {
        expect(command.pattern.test('/notebook')).toBe(true);
      });

      it('matches /notebook all', () => {
        expect(command.pattern.test('/notebook all')).toBe(true);
      });

      it('matches case-insensitively (/notebook ALL)', () => {
        expect(command.pattern.test('/notebook ALL')).toBe(true);
      });

      it('does not match /notebookfoo (no space separator)', () => {
        expect(command.pattern.test('/notebookfoo')).toBe(false);
      });

      it('does not match /notebook all extra (extra tokens)', () => {
        expect(command.pattern.test('/notebook all extra')).toBe(false);
      });

      it('does not match /notebook all with trailing space', () => {
        expect(command.pattern.test('/notebook all ')).toBe(false);
      });
    });
  });

  describe('execute', () => {
    it('sends formatted usage hint when command is malformed', async () => {
      const result = await command.execute(PHONE, CONV, '/notebookfoo');

      expect(result.isOk()).toBe(true);
      expect(mockNotebookFormatter.formatInvalidUsage).toHaveBeenCalled();
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(PHONE, '📖 *Utilisation :*\n• /notebook\n• /notebook all');
      expect(mockGetVocabularyUseCase.execute).not.toHaveBeenCalled();
    });

    it('sends text only when vocabulary is empty', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([]));
      mockNotebookFormatter.formatReply.mockReturnValue('📖 *Vocabulaire* — 0 mots');

      const result = await command.execute(PHONE, CONV, '/notebook');

      expect(result.isOk()).toBe(true);
      expect(mockNotebookFormatter.formatReply).toHaveBeenCalledWith([], false);
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(PHONE, '📖 *Vocabulaire* — 0 mots');
      expect(mockWhatsAppSender.sendDocument).not.toHaveBeenCalled();
    });

    it('sends text then PDF when vocabulary has entries', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
      mockNotebookFormatter.formatReply.mockReturnValue('📖 *Vocabulaire* — 1 mot');
      mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));

      const result = await command.execute(PHONE, CONV, '/notebook');

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

      await command.execute(PHONE, CONV, '/notebook all');

      expect(mockNotebookFormatter.formatReply).toHaveBeenCalledWith([ENTRY], true);
    });

    it('returns error when vocabulary fetch fails', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB down')));

      const result = await command.execute(PHONE, CONV, '/notebook');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB down');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns error when PDF generation fails', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
      mockNotebookFormatter.formatReply.mockReturnValue('...');
      mockNotebookFormatter.generatePdf.mockRejectedValue(new Error('Out of memory'));

      const result = await command.execute(PHONE, CONV, '/notebook');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Out of memory');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns error when text send fails', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
      mockNotebookFormatter.formatReply.mockReturnValue('...');
      mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await command.execute(PHONE, CONV, '/notebook');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
      expect(mockWhatsAppSender.sendDocument).not.toHaveBeenCalled();
    });

    it('returns error when PDF send fails', async () => {
      mockGetVocabularyUseCase.execute.mockReturnValue(okAsync([ENTRY]));
      mockNotebookFormatter.formatReply.mockReturnValue('...');
      mockNotebookFormatter.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4'));
      mockWhatsAppSender.sendDocument.mockRejectedValue(new Error('Upload failed'));

      const result = await command.execute(PHONE, CONV, '/notebook');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Upload failed');
    });
  });
});

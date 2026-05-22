import { okAsync, errAsync } from 'neverthrow';
import { VocabularyCommand } from './vocabulary-command';
import { ServiceUnavailableError } from '../../../domain/errors';

const mockExplainVocabularyInConversationUseCase = { execute: jest.fn() };
const mockVocabularyFormatter = { formatReply: jest.fn(), formatMissingWord: jest.fn() };
const mockWhatsAppSender = { sendMessage: jest.fn(), sendDocument: jest.fn() };

const command = new VocabularyCommand(
  mockExplainVocabularyInConversationUseCase as any,
  mockVocabularyFormatter,
  mockWhatsAppSender,
);

const PHONE = '+1000';
const CONV = 'conv-1';

describe('VocabularyCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
    mockVocabularyFormatter.formatReply.mockImplementation(
      (word: string, explanation: string) => `📚 *${word}* 🇫🇷\n\n${explanation}`,
    );
    mockVocabularyFormatter.formatMissingWord.mockReturnValue(
      '📚 *Utilisation*, indique un mot à expliquer *:*\n• /vocabulary bonjour\n• /vocabulary se passer',
    );
  });

  it('usage string is /vocabulary [mot]', () => {
    expect(command.usage).toBe('/vocabulary [mot]');
  });

  describe('regex', () => {
    describe('trigger', () => {
      it('matches /vocabulary', () => {
        expect(command.trigger.test('/vocabulary')).toBe(true);
      });

      it('matches /vocabulary bonjour', () => {
        expect(command.trigger.test('/vocabulary bonjour')).toBe(true);
      });

      it('matches case-insensitively', () => {
        expect(command.trigger.test('/VOCABULARY bonjour')).toBe(true);
      });
    });

    describe('pattern', () => {
      it('matches /vocabulary <word> and captures the word', () => {
        expect(command.pattern.exec('/vocabulary bonjour')?.[1]).toBe('bonjour');
      });

      it('matches /vocabulary <multi-word phrase>', () => {
        expect(command.pattern.exec('/vocabulary se passer')?.[1]).toBe('se passer');
      });

      it('matches case-insensitively', () => {
        expect(command.pattern.exec('/VOCABULARY bonjour')?.[1]).toBe('bonjour');
      });

      it('matches words with digits such as typos', () => {
        expect(command.pattern.exec('/vocabulary b0njour')?.[1]).toBe('b0njour');
      });

      it('does not match /vocabulary with no word', () => {
        expect(command.pattern.exec('/vocabulary')).toBeNull();
      });

      it('does not match /vocabulary followed only by spaces', () => {
        expect(command.pattern.exec('/vocabulary   ')).toBeNull();
      });
    });
  });

  describe('execute', () => {
    it('explains the word and sends the formatted reply', async () => {
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(
        okAsync('«Bonjour» est une salutation.'),
      );

      const result = await command.execute(PHONE, CONV, '/vocabulary bonjour');

      expect(result.isOk()).toBe(true);
      expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith(CONV, 'bonjour');
      expect(mockVocabularyFormatter.formatReply).toHaveBeenCalledWith('bonjour', '«Bonjour» est une salutation.');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        PHONE,
        '📚 *bonjour* 🇫🇷\n\n«Bonjour» est une salutation.',
      );
    });

    it('sends formatted reply for a multi-word phrase', async () => {
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(okAsync('Explication.'));

      await command.execute(PHONE, CONV, '/vocabulary se passer');

      expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith(CONV, 'se passer');
      expect(mockVocabularyFormatter.formatReply).toHaveBeenCalledWith('se passer', 'Explication.');
    });

    it('sends formatted usage hint when no word is provided', async () => {
      const result = await command.execute(PHONE, CONV, '/vocabulary');

      expect(result.isOk()).toBe(true);
      expect(mockVocabularyFormatter.formatMissingWord).toHaveBeenCalled();
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        PHONE,
        '📚 *Utilisation*, indique un mot à expliquer *:*\n• /vocabulary bonjour\n• /vocabulary se passer',
      );
      expect(mockExplainVocabularyInConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns error when vocabulary service fails', async () => {
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(
        errAsync(new ServiceUnavailableError('LLM down')),
      );

      const result = await command.execute(PHONE, CONV, '/vocabulary bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('LLM down');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns error when WhatsApp send fails', async () => {
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(okAsync('Explication.'));
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await command.execute(PHONE, CONV, '/vocabulary bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    });
  });
});

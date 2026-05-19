import { okAsync, errAsync } from 'neverthrow';
import { VocabularyWhatsAppCommand } from './whatsapp-vocabulary-command';
import { ServiceUnavailableError } from '../../domain/errors';

const mockExplainVocabularyInConversationUseCase = { execute: jest.fn() };
const mockWhatsAppSender = { sendMessage: jest.fn(), sendDocument: jest.fn() };

const command = new VocabularyWhatsAppCommand(
  mockExplainVocabularyInConversationUseCase as any,
  mockWhatsAppSender,
);

function matchFor(input: string) {
  return command.regex.exec(input)!;
}

describe('VocabularyWhatsAppCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
  });

  describe('regex', () => {
    it('matches /vocabulary <word>', () => {
      expect(command.regex.exec('/vocabulary bonjour')?.[1]).toBe('bonjour');
    });

    it('matches /vocabulary <multi-word phrase>', () => {
      expect(command.regex.exec('/vocabulary se passer')?.[1]).toBe('se passer');
    });

    it('matches case-insensitively', () => {
      expect(command.regex.exec('/VOCABULARY bonjour')?.[1]).toBe('bonjour');
    });

    it('does not match /vocabulary with no word', () => {
      expect(command.regex.exec('/vocabulary')).toBeNull();
    });

    it('does not match /vocabulary followed only by spaces', () => {
      expect(command.regex.exec('/vocabulary ')).toBeNull();
    });

    it('does not match /vocabularyblah (no space separator)', () => {
      expect(command.regex.exec('/vocabularyblah')).toBeNull();
    });
  });

  it('explains the word and sends the explanation', async () => {
    mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(
      okAsync('«Bonjour» est une salutation.'),
    );

    const result = await command.execute('+1000', 'conv-1', matchFor('/vocabulary bonjour'));

    expect(result.isOk()).toBe(true);
    expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith('conv-1', 'bonjour');
    expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+1000', '«Bonjour» est une salutation.');
  });

  it('sends explanation for a multi-word phrase', async () => {
    mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(okAsync('Explication.'));

    await command.execute('+1000', 'conv-1', matchFor('/vocabulary se passer'));

    expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith('conv-1', 'se passer');
  });

  it('returns error when vocabulary service fails', async () => {
    mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(
      errAsync(new ServiceUnavailableError('LLM down')),
    );

    const result = await command.execute('+1000', 'conv-1', matchFor('/vocabulary bonjour'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('LLM down');
    expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
  });

  it('returns error when WhatsApp send fails', async () => {
    mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(okAsync('Explication.'));
    mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

    const result = await command.execute('+1000', 'conv-1', matchFor('/vocabulary bonjour'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
  });
});

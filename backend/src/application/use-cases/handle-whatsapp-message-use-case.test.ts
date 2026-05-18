import { okAsync, errAsync } from 'neverthrow';
import { HandleWhatsAppMessageUseCase } from './handle-whatsapp-message-use-case';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

const mockPhoneSessionRepository = {
  findByPhone: jest.fn(),
  save: jest.fn(),
};

const mockCreateConversationUseCase = {
  execute: jest.fn(),
};

const mockSendMessageUseCase = {
  execute: jest.fn(),
};

const mockExplainVocabularyInConversationUseCase = {
  execute: jest.fn(),
};

const mockWhatsAppSender = {
  sendMessage: jest.fn(),
};

describe('HandleWhatsAppMessageUseCase', () => {
  let useCase: HandleWhatsAppMessageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
    useCase = new HandleWhatsAppMessageUseCase(
      mockPhoneSessionRepository,
      mockCreateConversationUseCase as any,
      mockSendMessageUseCase as any,
      mockExplainVocabularyInConversationUseCase as any,
      mockWhatsAppSender,
    );
  });

  describe('new phone — plain text', () => {
    it('sends greeting to first-time sender', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('+10000000001', 'Salut');

      expect(result.isOk()).toBe(true);
      expect(mockPhoneSessionRepository.save).toHaveBeenCalledWith('+10000000001', 'conv-123');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Bonjour ! Je suis Sophie.');
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns an error when session save fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockRejectedValue(new Error('DB write failed'));

      const result = await useCase.execute('+10000000001', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB write failed');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns an error when greeting delivery fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await useCase.execute('+10000000001', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    });

    it('returns an error when LLM is unavailable', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        errAsync(new ServiceUnavailableError('LLM down')),
      );

      const result = await useCase.execute('+10000000001', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('LLM down');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('new phone — /vocabulary command', () => {
    it('sends greeting and discards command for first-time sender', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('+10000000001', '/vocabulary bonjour');

      expect(result.isOk()).toBe(true);
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Bonjour ! Je suis Sophie.');
      expect(mockExplainVocabularyInConversationUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('existing phone — plain text', () => {
    it('delivers tutor response to returning sender', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        okAsync({ message: 'Je veux parler de cuisine', tutorResponse: 'Super ! La cuisine française est délicieuse.', messageId: 'msg-1' }),
      );

      const result = await useCase.execute('+10000000001', 'Je veux parler de cuisine');

      expect(result.isOk()).toBe(true);
      expect(mockSendMessageUseCase.execute).toHaveBeenCalledWith('conv-456', 'Je veux parler de cuisine');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Super ! La cuisine française est délicieuse.');
      expect(mockCreateConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns an error when conversation not found', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        errAsync(new NotFoundError('Conversation not found')),
      );

      const result = await useCase.execute('+10000000001', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServiceUnavailableError);
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns an error when WhatsApp delivery fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        okAsync({ message: 'Bonjour', tutorResponse: 'Salut !', messageId: 'msg-2' }),
      );
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await useCase.execute('+10000000001', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    });
  });

  describe('existing phone — /vocabulary command', () => {
    it('explains vocabulary for a known word and delivers the explanation', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(
        okAsync('«Cuisine» désigne l\'art de préparer des repas.'),
      );

      const result = await useCase.execute('+10000000001', '/vocabulary cuisine');

      expect(result.isOk()).toBe(true);
      expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith('conv-456', 'cuisine');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        '«Cuisine» désigne l\'art de préparer des repas.',
      );
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('explains multi-word phrase as a single expression', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockExplainVocabularyInConversationUseCase.execute.mockReturnValue(okAsync('Explication.'));

      await useCase.execute('+10000000001', '/vocabulary se passer');

      expect(mockExplainVocabularyInConversationUseCase.execute).toHaveBeenCalledWith('conv-456', 'se passer');
    });
  });

  describe('existing phone — unknown command', () => {
    it('replies with usage hint for unrecognised command', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');

      const result = await useCase.execute('+10000000001', '/notebook');

      expect(result.isOk()).toBe(true);
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        'Commande inconnue. Pour expliquer un mot, écrivez /vocabulary [mot].',
      );
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
      expect(mockExplainVocabularyInConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('replies with usage hint when /vocabulary has no word', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');

      await useCase.execute('+10000000001', '/vocabulary');

      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        'Commande inconnue. Pour expliquer un mot, écrivez /vocabulary [mot].',
      );
      expect(mockExplainVocabularyInConversationUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('session lookup failure', () => {
    it('returns an error when phone lookup fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockRejectedValue(new Error('DB down'));

      const result = await useCase.execute('+10000000001', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB down');
    });
  });
});

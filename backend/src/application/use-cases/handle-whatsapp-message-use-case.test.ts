import { okAsync, errAsync } from 'neverthrow';
import { HandleWhatsAppMessageUseCase } from './handle-whatsapp-message-use-case';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

const mockPhoneSessionRepository = {
  findConversationId: jest.fn(),
  save: jest.fn(),
};

const mockCreateConversationUseCase = {
  execute: jest.fn(),
};

const mockSendMessageUseCase = {
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
      mockWhatsAppSender,
    );
  });

  describe('new phone number', () => {
    it('creates a conversation, saves the session, and sends the initial greeting', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('+56967022669', 'Salut');

      expect(result.isOk()).toBe(true);
      expect(mockPhoneSessionRepository.save).toHaveBeenCalledWith('+56967022669', 'conv-123');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+56967022669', 'Bonjour ! Je suis Sophie.');
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns ServiceUnavailableError when saving the phone session fails', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockRejectedValue(new Error('DB write failed'));

      const result = await useCase.execute('+56967022669', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB write failed');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns ServiceUnavailableError when sending the initial greeting fails', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await useCase.execute('+56967022669', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    });

    it('returns ServiceUnavailableError when conversation creation fails', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        errAsync(new ServiceUnavailableError('LLM down')),
      );

      const result = await useCase.execute('+56967022669', 'Salut');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('LLM down');
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('existing phone number', () => {
    it('sends message to existing conversation and delivers tutor response', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        okAsync({ message: 'Je veux parler de cuisine', tutorResponse: 'Super ! La cuisine française est délicieuse.', messageId: 'msg-1' }),
      );

      const result = await useCase.execute('+56967022669', 'Je veux parler de cuisine');

      expect(result.isOk()).toBe(true);
      expect(mockSendMessageUseCase.execute).toHaveBeenCalledWith('conv-456', 'Je veux parler de cuisine');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+56967022669', 'Super ! La cuisine française est délicieuse.');
      expect(mockCreateConversationUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns ServiceUnavailableError when the conversation is not found', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        errAsync(new NotFoundError('Conversation not found')),
      );

      const result = await useCase.execute('+56967022669', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServiceUnavailableError);
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });

    it('returns ServiceUnavailableError when WhatsApp send fails', async () => {
      mockPhoneSessionRepository.findConversationId.mockResolvedValue('conv-456');
      mockSendMessageUseCase.execute.mockReturnValue(
        okAsync({ message: 'Bonjour', tutorResponse: 'Salut !', messageId: 'msg-2' }),
      );
      mockWhatsAppSender.sendMessage.mockRejectedValue(new Error('Meta API error 503'));

      const result = await useCase.execute('+56967022669', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Meta API error 503');
    });
  });

  describe('repository failure', () => {
    it('returns ServiceUnavailableError when phone lookup fails', async () => {
      mockPhoneSessionRepository.findConversationId.mockRejectedValue(new Error('DB down'));

      const result = await useCase.execute('+56967022669', 'Bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB down');
    });
  });
});

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

const mockWhatsAppSender = {
  sendMessage: jest.fn(),
  sendDocument: jest.fn(),
};

const mockCommandA = {
  regex: /^\/command-a(\s+\w+)?$/i,
  execute: jest.fn(),
};

const mockCommandB = {
  regex: /^\/command-b(\s+all)?/i,
  execute: jest.fn(),
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
      [mockCommandA, mockCommandB],
    );
  });

  describe('new phone', () => {
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

    it('sends greeting and discards any command for first-time sender', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-123', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('+10000000001', '/command-a');

      expect(result.isOk()).toBe(true);
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Bonjour ! Je suis Sophie.');
      expect(mockCommandA.execute).not.toHaveBeenCalled();
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

  describe('existing phone — command routing', () => {
    it('routes /command-a to command A, not B', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockCommandA.execute.mockReturnValue(okAsync(undefined));

      const result = await useCase.execute('+10000000001', '/command-a');

      expect(result.isOk()).toBe(true);
      expect(mockCommandA.execute).toHaveBeenCalledWith('+10000000001', 'conv-456', expect.any(Array));
      expect(mockCommandB.execute).not.toHaveBeenCalled();
    });

    it('routes /command-b to command B, not A', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockCommandB.execute.mockReturnValue(okAsync(undefined));

      const result = await useCase.execute('+10000000001', '/command-b');

      expect(result.isOk()).toBe(true);
      expect(mockCommandB.execute).toHaveBeenCalledWith('+10000000001', 'conv-456', expect.any(Array));
      expect(mockCommandA.execute).not.toHaveBeenCalled();
    });

    it('routes /command-b all to command B', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockCommandB.execute.mockReturnValue(okAsync(undefined));

      await useCase.execute('+10000000001', '/command-b all');

      expect(mockCommandB.execute).toHaveBeenCalledWith('+10000000001', 'conv-456', expect.any(Array));
    });

    it('propagates errors from a matched command', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');
      mockCommandA.execute.mockReturnValue(errAsync(new ServiceUnavailableError('Command failed')));

      const result = await useCase.execute('+10000000001', '/command-a');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Command failed');
    });

    it('replies with usage hint for unrecognised command', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');

      const result = await useCase.execute('+10000000001', '/unknown');

      expect(result.isOk()).toBe(true);
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        'Commande inconnue. Commandes disponibles : /vocabulary [mot] · /notebook',
      );
      expect(mockCommandA.execute).not.toHaveBeenCalled();
      expect(mockCommandB.execute).not.toHaveBeenCalled();
    });

    it('replies with usage hint when command prefix matches no registered command', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-456');

      await useCase.execute('+10000000001', '/command-a-missing-arg');

      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        'Commande inconnue. Commandes disponibles : /vocabulary [mot] · /notebook',
      );
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

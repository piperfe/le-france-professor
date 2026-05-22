import { okAsync, errAsync } from 'neverthrow';
import { StartOrResumeConversationUseCase, ConversationStatus } from './start-or-resume-conversation-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

const mockPhoneSessionRepository = { findByPhone: jest.fn(), save: jest.fn() };
const mockCreateConversationUseCase = { execute: jest.fn() };

const useCase = new StartOrResumeConversationUseCase(
  mockPhoneSessionRepository as any,
  mockCreateConversationUseCase as any,
);

describe('StartOrResumeConversationUseCase', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('existing phone', () => {
    it('returns RESUMED session without creating a conversation', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue('conv-123');

      const result = await useCase.execute('+10000000001');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ status: ConversationStatus.RESUMED, conversationId: 'conv-123' });
      expect(mockCreateConversationUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('new phone', () => {
    it('creates a conversation, saves the session, and returns STARTED with initial message', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-456', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );
      mockPhoneSessionRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('+10000000002');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({
        status: ConversationStatus.STARTED,
        conversationId: 'conv-456',
        initialMessage: 'Bonjour ! Je suis Sophie.',
      });
      expect(mockPhoneSessionRepository.save).toHaveBeenCalledWith('+10000000002', 'conv-456');
    });

    it('returns error when conversation creation fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        errAsync(new ServiceUnavailableError('LLM down')),
      );

      const result = await useCase.execute('+10000000002');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('LLM down');
      expect(mockPhoneSessionRepository.save).not.toHaveBeenCalled();
    });

    it('returns error when session save fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockResolvedValue(null);
      mockCreateConversationUseCase.execute.mockReturnValue(
        okAsync({ conversationId: 'conv-456', initialMessage: 'Bonjour !' }),
      );
      mockPhoneSessionRepository.save.mockRejectedValue(new Error('DB write failed'));

      const result = await useCase.execute('+10000000002');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB write failed');
    });
  });

  describe('lookup failure', () => {
    it('returns error when phone lookup fails', async () => {
      mockPhoneSessionRepository.findByPhone.mockRejectedValue(new Error('DB down'));

      const result = await useCase.execute('+10000000001');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB down');
    });
  });
});

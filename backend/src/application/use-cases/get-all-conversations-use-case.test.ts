import { GetAllConversationsUseCase } from './get-all-conversations-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { ServiceUnavailableError } from '../../domain/errors';

describe('GetAllConversationsUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let useCase: GetAllConversationsUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    useCase = new GetAllConversationsUseCase(mockRepository);
  });

  it('should return stored title when set', async () => {
    const conv = Conversation.create();
    conv.setTitle('La cuisine française avec Sophie');
    mockRepository.findAll.mockResolvedValue([conv]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(conv.id);
      expect(result.value[0].title).toBe('La cuisine française avec Sophie');
      expect(result.value[0].createdAt).toBe(conv.createdAt);
    }
  });

  it('should use "Nouvelle conversation DD/MM HH:mm" fallback when no title set', async () => {
    const conv = Conversation.create();
    mockRepository.findAll.mockResolvedValue([conv]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].title).toMatch(/^Nouvelle conversation \d{2}\/\d{2} \d{2}:\d{2}$/);
    }
  });

  it('should return ok with empty array when no conversations exist', async () => {
    mockRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([]);
    }
  });

  it('should return err with ServiceUnavailableError when repository throws', async () => {
    mockRepository.findAll.mockRejectedValue(new Error('DB connection failed'));

    const result = await useCase.execute();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.message).toBe('DB connection failed');
    }
  });
});

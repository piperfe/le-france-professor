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

  it('should return ok with summaries for all conversations', async () => {
    const conv = Conversation.create();
    const message = Message.create('Bonjour ! Comment puis-je vous aider ?', MessageSender.TUTOR);
    conv.addMessage(message);
    mockRepository.findAll.mockResolvedValue([conv]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(conv.id);
      expect(result.value[0].title).toBe('Bonjour ! Comment puis-je vous aider ?');
      expect(result.value[0].createdAt).toBe(conv.createdAt);
    }
  });

  it('should truncate title to 40 chars with ellipsis', async () => {
    const conv = Conversation.create();
    const longContent = 'Bonjour ! Je suis ravi de vous rencontrer et de commencer cette leçon.';
    const message = Message.create(longContent, MessageSender.TUTOR);
    conv.addMessage(message);
    mockRepository.findAll.mockResolvedValue([conv]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].title).toBe('Bonjour ! Je suis ravi de vous rencontre…');
    }
  });

  it('should use "Nouvelle conversation" when no tutor message exists', async () => {
    const conv = Conversation.create();
    mockRepository.findAll.mockResolvedValue([conv]);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].title).toBe('Nouvelle conversation');
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

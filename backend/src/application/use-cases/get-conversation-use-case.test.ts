import { GetConversationUseCase } from './get-conversation-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

describe('GetConversationUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let useCase: GetConversationUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    useCase = new GetConversationUseCase(mockRepository);
  });

  it('should return ok with conversation DTO when found', async () => {
    const conversation = Conversation.create();
    const message = Message.create('Hello', MessageSender.USER);
    conversation.addMessage(message);
    mockRepository.findById.mockResolvedValue(conversation);

    const result = await useCase.execute('conv-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.id).toBe(conversation.id);
      expect(result.value.messages).toHaveLength(1);
      expect(result.value.messages[0].content).toBe('Hello');
    }
  });

  it('should return err with NotFoundError when conversation does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('conv-1');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Conversation not found');
    }
  });

  it('should return err with ServiceUnavailableError when repository throws', async () => {
    mockRepository.findById.mockRejectedValue(new Error('DB connection failed'));

    const result = await useCase.execute('conv-1');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error.message).toBe('DB connection failed');
    }
  });
});

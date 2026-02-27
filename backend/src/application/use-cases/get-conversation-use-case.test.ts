import { GetConversationUseCase } from './get-conversation-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';

describe('GetConversationUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let useCase: GetConversationUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new GetConversationUseCase(mockRepository);
  });

  it('should get a conversation by id', async () => {
    const conversation = Conversation.create();
    const message = Message.create('Hello', MessageSender.USER);
    conversation.addMessage(message);
    mockRepository.findById.mockResolvedValue(conversation);

    const result = await useCase.execute('conv-1');

    expect(result.id).toBe(conversation.id);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Hello');
  });

  it('should throw error if conversation not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('conv-1')).rejects.toThrow(
      'Conversation not found',
    );
  });
});

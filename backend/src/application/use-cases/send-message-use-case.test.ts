import { SendMessageUseCase } from './send-message-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';

describe('SendMessageUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTutorService: jest.Mocked<TutorService>;
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    mockTutorService = {
      initiateConversation: jest.fn(),
      generateResponse: jest.fn(),
      selectTopic: jest.fn(),
    };
    useCase = new SendMessageUseCase(mockRepository, mockTutorService);
  });

  it('should send a message and get tutor response', async () => {
    const conversation = Conversation.create();
    const initialMessage = Message.create('Hello', MessageSender.TUTOR);
    conversation.addMessage(initialMessage);
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Bonjour !');

    const result = await useCase.execute('conv-1', 'Hello');

    expect(result.message).toBe('Hello');
    expect(result.tutorResponse).toBe('Bonjour !');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error if conversation not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('conv-1', 'Hello')).rejects.toThrow(
      'Conversation not found',
    );
  });
});

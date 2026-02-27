import { CreateConversationUseCase } from './create-conversation-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';

describe('CreateConversationUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTutorService: jest.Mocked<TutorService>;
  let useCase: CreateConversationUseCase;

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
    useCase = new CreateConversationUseCase(mockRepository, mockTutorService);
  });

  it('should create a conversation with initial message', async () => {
    const initialMessage = 'Bonjour ! Comment allez-vous ?';
    mockTutorService.initiateConversation.mockResolvedValue(initialMessage);
    mockRepository.save.mockResolvedValue();

    const result = await useCase.execute();

    expect(result.conversationId).toBeDefined();
    expect(result.initialMessage).toBe(initialMessage);
    expect(mockTutorService.initiateConversation).toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});

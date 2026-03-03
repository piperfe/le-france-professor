import { CreateConversationUseCase } from './create-conversation-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { ServiceUnavailableError } from '../../domain/errors';

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

  it('should return ok with conversationId and initialMessage', async () => {
    const initialMessage = 'Bonjour ! Comment allez-vous ?';
    mockTutorService.initiateConversation.mockResolvedValue(initialMessage);
    mockRepository.save.mockResolvedValue();

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.conversationId).toBeDefined();
      expect(result.value.initialMessage).toBe(initialMessage);
    }
    expect(mockTutorService.initiateConversation).toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should return err with ServiceUnavailableError when tutor service fails', async () => {
    mockTutorService.initiateConversation.mockRejectedValue(new Error('LLM unavailable'));

    const result = await useCase.execute();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error.message).toBe('LLM unavailable');
    }
  });

  it('should return err with ServiceUnavailableError when repository save fails', async () => {
    mockTutorService.initiateConversation.mockResolvedValue('Bonjour !');
    mockRepository.save.mockRejectedValue(new Error('DB write failed'));

    const result = await useCase.execute();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error.message).toBe('DB write failed');
    }
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateConversationUseCase } from './create-conversation-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';

describe('CreateConversationUseCase', () => {
  let mockRepository: ConversationRepository;
  let useCase: CreateConversationUseCase;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
    };
    useCase = new CreateConversationUseCase(mockRepository);
  });

  it('should create a conversation', async () => {
    const expectedResult = {
      conversationId: 'conv-1',
      initialMessage: 'Bonjour !',
    };
    (mockRepository.create as any).mockResolvedValue(expectedResult);

    const result = await useCase.execute();

    expect(result).toEqual(expectedResult);
    expect(mockRepository.create).toHaveBeenCalled();
  });
});

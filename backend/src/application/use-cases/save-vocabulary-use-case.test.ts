import { SaveVocabularyUseCase } from './save-vocabulary-use-case';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';
import { ServiceUnavailableError } from '../../domain/errors';

describe('SaveVocabularyUseCase', () => {
  let mockRepository: jest.Mocked<VocabularyRepository>;
  let useCase: SaveVocabularyUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByConversationId: jest.fn(),
    };
    useCase = new SaveVocabularyUseCase(mockRepository);
  });

  it('returns ok on successful save', async () => {
    mockRepository.save.mockResolvedValue(undefined);

    const result = await useCase.execute('passée', 'Explication.', 'msg-1', 'conv-1');

    expect(result.isOk()).toBe(true);
  });

  it('saves entry with correct fields', async () => {
    mockRepository.save.mockResolvedValue(undefined);

    await useCase.execute('passée', 'Explication.', 'msg-1', 'conv-1');

    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'passée',
        explanation: 'Explication.',
        sourceMessageId: 'msg-1',
        conversationId: 'conv-1',
      }),
    );
  });

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    mockRepository.save.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute('passée', 'Explication.', 'msg-1', 'conv-1');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.message).toBe('DB error');
    }
  });
});

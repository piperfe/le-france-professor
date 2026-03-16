import { GetVocabularyUseCase } from './get-vocabulary-use-case';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import { ServiceUnavailableError } from '../../domain/errors';

describe('GetVocabularyUseCase', () => {
  let mockRepository: jest.Mocked<VocabularyRepository>;
  let useCase: GetVocabularyUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByConversationId: jest.fn(),
    };
    useCase = new GetVocabularyUseCase(mockRepository);
  });

  it('returns entries for a conversation', async () => {
    const entries = [VocabularyEntry.create('passée', 'Explication.', 'msg-1', 'conv-1')];
    mockRepository.findByConversationId.mockResolvedValue(entries);

    const result = await useCase.execute('conv-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(entries);
    }
  });

  it('returns ok with empty array when no entries', async () => {
    mockRepository.findByConversationId.mockResolvedValue([]);

    const result = await useCase.execute('conv-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([]);
    }
  });

  it('passes conversationId to repository', async () => {
    mockRepository.findByConversationId.mockResolvedValue([]);

    await useCase.execute('conv-42');

    expect(mockRepository.findByConversationId).toHaveBeenCalledWith('conv-42');
  });

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    mockRepository.findByConversationId.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute('conv-1');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
    }
  });
});

import { ExplainVocabularyUseCase } from './explain-vocabulary-use-case';
import { VocabularyService } from '../../domain/services/vocabulary-service';
import { ServiceUnavailableError } from '../../domain/errors';

describe('ExplainVocabularyUseCase', () => {
  let mockVocabularyService: jest.Mocked<VocabularyService>;
  let useCase: ExplainVocabularyUseCase;

  beforeEach(() => {
    mockVocabularyService = {
      explainVocabulary: jest.fn(),
    };
    useCase = new ExplainVocabularyUseCase(mockVocabularyService);
  });

  it('returns ok with explanation on success', async () => {
    const explanation = '«Passée» est le participe passé féminin du verbe «se passer».';
    mockVocabularyService.explainVocabulary.mockResolvedValue(explanation);

    const result = await useCase.execute('passée', "Comment s'est passée ta journée ?");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.explanation).toBe(explanation);
    }
  });

  it('passes word and context to the vocabulary service', async () => {
    mockVocabularyService.explainVocabulary.mockResolvedValue('Explication.');

    await useCase.execute('passée', "Comment s'est passée ta journée ?");

    expect(mockVocabularyService.explainVocabulary).toHaveBeenCalledWith(
      'passée',
      "Comment s'est passée ta journée ?",
    );
  });

  it('returns err with ServiceUnavailableError when vocabulary service throws', async () => {
    mockVocabularyService.explainVocabulary.mockRejectedValue(new Error('LLM timeout'));

    const result = await useCase.execute('passée', '');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error.message).toBe('LLM timeout');
    }
  });
});

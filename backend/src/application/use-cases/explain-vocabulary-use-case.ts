import { ResultAsync } from 'neverthrow';
import type { VocabularyService } from '../../domain/services/vocabulary-service';
import { ServiceUnavailableError } from '../../domain/errors';

export class ExplainVocabularyUseCase {
  constructor(private vocabularyService: VocabularyService) {}

  execute(
    word: string,
    context: string,
  ): ResultAsync<{ explanation: string }, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.vocabularyService.explainVocabulary(word, context),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Vocabulary service unavailable',
        ),
    ).map((explanation) => ({ explanation }));
  }
}

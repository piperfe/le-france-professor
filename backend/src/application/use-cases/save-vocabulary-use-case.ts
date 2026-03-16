import { ResultAsync } from 'neverthrow';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import { ServiceUnavailableError } from '../../domain/errors';

export class SaveVocabularyUseCase {
  constructor(private repository: VocabularyRepository) {}

  execute(
    word: string,
    explanation: string,
    sourceMessageId: string,
    conversationId: string,
  ): ResultAsync<void, ServiceUnavailableError> {
    const entry = VocabularyEntry.create(word, explanation, sourceMessageId, conversationId);
    return ResultAsync.fromPromise(
      this.repository.save(entry),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Vocabulary repository unavailable',
        ),
    );
  }
}

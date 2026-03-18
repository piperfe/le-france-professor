import { ResultAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';
import type { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import { ServiceUnavailableError } from '../../domain/errors';

export class GetVocabularyUseCase {
  constructor(private repository: VocabularyRepository) {}

  @Span()
  execute(conversationId: string): ResultAsync<VocabularyEntry[], ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.repository.findByConversationId(conversationId),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Vocabulary repository unavailable',
        ),
    );
  }
}

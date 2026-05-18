import { ResultAsync } from 'neverthrow';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';
import type { VocabularyService } from '../../domain/services/vocabulary-service';
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import { ServiceUnavailableError } from '../../domain/errors';

export class ExplainVocabularyInConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly vocabularyService: VocabularyService,
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  execute(conversationId: string, word: string): ResultAsync<string, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.getLastTutorMessage(conversationId),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Repository unavailable'),
    ).andThen((lastTutorMessage) =>
      ResultAsync.fromPromise(
        this.vocabularyService.explainVocabulary(word, lastTutorMessage?.content ?? ''),
        (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Vocabulary service unavailable'),
      ).andThen((explanation) => {
        const entry = VocabularyEntry.create(word, explanation, lastTutorMessage?.id ?? '', conversationId);
        return ResultAsync.fromPromise(
          this.vocabularyRepository.save(entry),
          (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Vocabulary repository unavailable'),
        ).map(() => explanation);
      }),
    );
  }
}

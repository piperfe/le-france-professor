import { ResultAsync, errAsync } from 'neverthrow';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import type { TutorService } from '../../domain/services/tutor-service';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

export class ExtractTopicUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private tutorService: TutorService,
  ) {}

  execute(conversationId: string): ResultAsync<void, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.findById(conversationId),
      (e) => new ServiceUnavailableError((e as Error).message),
    ).andThen((conversation) => {
      if (!conversation) {
        return errAsync(new NotFoundError('Conversation not found'));
      }

      if (conversation.isTopicDiscovered()) {
        return ResultAsync.fromSafePromise(Promise.resolve());
      }

      const history = Array.from(conversation.getMessages()).map((m) => m.content);
      return ResultAsync.fromPromise(
        this.tutorService.extractTopic(history),
        (e) => new ServiceUnavailableError((e as Error).message),
      ).andThen((topic) => {
        conversation.setTopic(topic);
        return ResultAsync.fromPromise(
          this.conversationRepository.save(conversation),
          (e) => new ServiceUnavailableError((e as Error).message),
        );
      });
    });
  }
}

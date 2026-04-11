import { ResultAsync, errAsync } from 'neverthrow';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import type { TitleService } from '../../domain/services/title-service';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

export class GenerateTitleUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private titleService: TitleService,
  ) {}

  execute(conversationId: string): ResultAsync<void, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.findById(conversationId),
      (e) => new ServiceUnavailableError((e as Error).message),
    ).andThen((conversation) => {
      if (!conversation) {
        return errAsync(new NotFoundError('Conversation not found'));
      }

      if (conversation.isTitleGenerated()) {
        return ResultAsync.fromSafePromise(Promise.resolve());
      }

      const messages = Array.from(conversation.getMessages());
      return ResultAsync.fromPromise(
        this.titleService.generateTitle(messages),
        (e) => new ServiceUnavailableError((e as Error).message),
      ).andThen((title) => {
        conversation.setTitle(title);
        return ResultAsync.fromPromise(
          this.conversationRepository.save(conversation),
          (e) => new ServiceUnavailableError((e as Error).message),
        );
      });
    });
  }
}

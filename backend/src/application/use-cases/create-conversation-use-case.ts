import { ResultAsync } from 'neverthrow';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import type { TutorService } from '../../domain/services/tutor-service';
import { ServiceUnavailableError } from '../../domain/errors';

type CreateConversationDTO = {
  conversationId: string;
  initialMessage: string;
};

export class CreateConversationUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private tutorService: TutorService,
  ) {}

  execute(): ResultAsync<CreateConversationDTO, ServiceUnavailableError> {
    const conversation = Conversation.create();

    return ResultAsync.fromPromise(
      this.tutorService.initiateConversation(),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Tutor service unavailable',
        ),
    ).andThen((initialMessage) => {
      const tutorMessage = Message.create(initialMessage, MessageSender.TUTOR);
      conversation.addMessage(tutorMessage);

      return ResultAsync.fromPromise(
        this.conversationRepository.save(conversation),
        (error) =>
          new ServiceUnavailableError(
            error instanceof Error ? error.message : 'Repository unavailable',
          ),
      ).map(() => ({
        conversationId: conversation.id,
        initialMessage,
      }));
    });
  }
}

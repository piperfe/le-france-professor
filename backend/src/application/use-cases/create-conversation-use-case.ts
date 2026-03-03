import { ResultAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
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

  @Span()
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

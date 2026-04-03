import { ResultAsync, errAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import { Message, MessageSender } from '../../domain/entities/message';
import type { Conversation } from '../../domain/entities/conversation';
import type { ConversationRepository } from '../../domain/repositories/conversation-repository';
import type { TutorService } from '../../domain/services/tutor-service';
import type { GenerateTitleUseCase } from './generate-title-use-case';
import type { ExtractTopicUseCase } from './extract-topic-use-case';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

const TITLE_TRIGGER_USER_MESSAGE = 2;
const TOPIC_TRIGGER_USER_MESSAGE = 4;

export class SendMessageUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private tutorService: TutorService,
    private generateTitleUseCase: GenerateTitleUseCase,
    private extractTopicUseCase: ExtractTopicUseCase,
  ) {}

  @Span()
  execute(
    conversationId: string,
    userMessage: string,
  ): ResultAsync<{ message: string; tutorResponse: string; messageId: string }, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.conversationRepository.findById(conversationId),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Repository unavailable',
        ),
    ).andThen((conversation) => {
      if (!conversation) {
        return errAsync(new NotFoundError('Conversation not found'));
      }

      const userMsg = Message.create(userMessage, MessageSender.USER);
      conversation.addMessage(userMsg);

      const conversationHistory = this.buildConversationHistory(conversation);

      return ResultAsync.fromPromise(
        this.tutorService.generateResponse(conversationHistory, userMessage, {
          phase: conversation.phase(),
          topic: conversation.topic,
        }),
        (error) =>
          new ServiceUnavailableError(
            error instanceof Error ? error.message : 'Tutor service unavailable',
          ),
      ).andThen((tutorResponse) => {
        const tutorMsg = Message.create(tutorResponse, MessageSender.TUTOR);
        conversation.addMessage(tutorMsg);

        return ResultAsync.fromPromise(
          this.conversationRepository.save(conversation),
          (error) =>
            new ServiceUnavailableError(
              error instanceof Error ? error.message : 'Repository unavailable',
            ),
        ).map(() => {
          this.maybeGenerateTitle(conversationId, conversation);
          this.maybeExtractTopic(conversationId, conversation);
          return { message: userMessage, tutorResponse, messageId: tutorMsg.id };
        });
      });
    });
  }

  private maybeGenerateTitle(conversationId: string, conversation: Conversation): void {
    if (conversation.userMessageCount() === TITLE_TRIGGER_USER_MESSAGE && !conversation.isTitleGenerated()) {
      void this.generateTitleUseCase.execute(conversationId);
    }
  }

  private maybeExtractTopic(conversationId: string, conversation: Conversation): void {
    if (conversation.userMessageCount() === TOPIC_TRIGGER_USER_MESSAGE && !conversation.isTopicDiscovered()) {
      void this.extractTopicUseCase.execute(conversationId);
    }
  }

  private buildConversationHistory(conversation: Conversation): string[] {
    return conversation.getMessages().map((msg: Message) => msg.content);
  }
}

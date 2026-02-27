import { SpanStatusCode } from '@opentelemetry/api';
import { Span } from '../../infrastructure/telemetry/decorators';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { tracer } from '../../infrastructure/telemetry/tracer';

export class CreateConversationUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private tutorService: TutorService,
  ) {}

  @Span()
  async execute(): Promise<{ conversationId: string; initialMessage: string }> {
    const conversation = Conversation.create();
    const initialMessage = await this.tutorService.initiateConversation();
    const tutorMessage = Message.create(initialMessage, MessageSender.TUTOR);
    conversation.addMessage(tutorMessage);
    await this.conversationRepository.save(conversation);
    return {
      conversationId: conversation.id,
      initialMessage: initialMessage,
    };
  }
}

import { Span } from '../../infrastructure/telemetry/decorators';
import { Message, MessageSender } from '../../domain/entities/message';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';

export class SendMessageUseCase {
  constructor(
    private conversationRepository: ConversationRepository,
    private tutorService: TutorService,
  ) {}

  @Span()
  async execute(
    conversationId: string,
    userMessage: string,
  ): Promise<{ message: string; tutorResponse: string }> {
    const conversation = await this.conversationRepository.findById(
      conversationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    const userMsg = Message.create(userMessage, MessageSender.USER);
    conversation.addMessage(userMsg);
    const conversationHistory = this.buildConversationHistory(conversation);
    const tutorResponse = await this.tutorService.generateResponse(
      conversationHistory,
      userMessage,
    );
    const tutorMsg = Message.create(tutorResponse, MessageSender.TUTOR);
    conversation.addMessage(tutorMsg);
    await this.conversationRepository.save(conversation);
    return {
      message: userMessage,
      tutorResponse: tutorResponse,
    };
  }

  private buildConversationHistory(conversation: any): string[] {
    return conversation.getMessages().map((msg: Message) => msg.content);
  }
}

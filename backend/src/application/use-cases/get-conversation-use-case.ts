import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class GetConversationUseCase {
  constructor(private conversationRepository: ConversationRepository) {}

  async execute(conversationId: string) {
    const conversation = await this.conversationRepository.findById(
      conversationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return {
      id: conversation.id,
      messages: conversation.getMessages().map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
      })),
      createdAt: conversation.createdAt,
    };
  }
}

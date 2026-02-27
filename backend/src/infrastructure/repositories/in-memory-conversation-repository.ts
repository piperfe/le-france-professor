import { Conversation } from '../../domain/entities/conversation';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class InMemoryConversationRepository
  implements ConversationRepository
{
  private conversations: Map<string, Conversation> = new Map();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }
}

import type { Conversation } from '../entities/conversation';
import type { Message } from '../entities/message';

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  getLastTutorMessage(conversationId: string): Promise<Message | null>;
}

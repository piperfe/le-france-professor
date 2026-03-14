import type { Conversation } from '../entities/conversation';

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
}

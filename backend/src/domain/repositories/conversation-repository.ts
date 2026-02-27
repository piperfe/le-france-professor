import { Conversation } from '../entities/conversation';

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
}

import { Conversation } from '../../domain/entities/conversation';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class GetConversationUseCase {
  constructor(private repository: ConversationRepository) {}

  async execute(conversationId: string): Promise<Conversation> {
    return await this.repository.getById(conversationId);
  }
}

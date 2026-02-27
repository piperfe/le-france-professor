import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class CreateConversationUseCase {
  constructor(private repository: ConversationRepository) {}

  async execute(): Promise<{ conversationId: string; initialMessage: string }> {
    return await this.repository.create();
  }
}

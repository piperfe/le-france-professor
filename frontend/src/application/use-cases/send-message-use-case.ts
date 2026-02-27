import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class SendMessageUseCase {
  constructor(private repository: ConversationRepository) {}

  async execute(
    conversationId: string,
    message: string,
  ): Promise<{ message: string; tutorResponse: string }> {
    return await this.repository.sendMessage(conversationId, message);
  }
}

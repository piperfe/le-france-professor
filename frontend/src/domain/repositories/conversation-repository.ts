import type { Conversation } from '../entities/conversation'

export interface ConversationRepository {
  create(): Promise<{ conversationId: string; initialMessage: string }>
  sendMessage(
    conversationId: string,
    message: string,
  ): Promise<{ message: string; tutorResponse: string }>
  getById(conversationId: string): Promise<Conversation>
}

import type { Conversation } from '../entities/conversation'

export type ConversationSummary = {
  id: string
  title: string
  createdAt: Date
}

export interface ConversationRepository {
  create(): Promise<{ conversationId: string; initialMessage: string }>
  sendMessage(
    conversationId: string,
    message: string,
  ): Promise<{ message: string; tutorResponse: string }>
  getById(conversationId: string): Promise<Conversation>
  explainVocabulary(
    conversationId: string,
    word: string,
    context: string,
  ): Promise<{ explanation: string }>
  findAll(): Promise<ConversationSummary[]>
}

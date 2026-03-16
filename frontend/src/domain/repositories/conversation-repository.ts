import type { Conversation } from '../entities/conversation'
import type { VocabularyEntry } from '../entities/vocabulary-entry'

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
  ): Promise<{ message: string; tutorResponse: string; messageId: string }>
  getById(conversationId: string): Promise<Conversation>
  explainVocabulary(
    conversationId: string,
    word: string,
    context: string,
    sourceMessageId: string,
  ): Promise<{ explanation: string }>
  getVocabulary(conversationId: string): Promise<VocabularyEntry[]>
  findAll(): Promise<ConversationSummary[]>
}

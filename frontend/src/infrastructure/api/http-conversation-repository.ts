import type { ConversationApiResponse } from '../../domain/entities/conversation';
import { Conversation } from '../../domain/entities/conversation'
import type { ConversationRepository, ConversationSummary } from '../../domain/repositories/conversation-repository'
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors'

export class HttpConversationRepository implements ConversationRepository {
  constructor(private baseUrl: string) {}

  async create(): Promise<{ conversationId: string; initialMessage: string }> {
    const response = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to create conversation')
    }
    return await response.json()
  }

  async sendMessage(
    conversationId: string,
    message: string,
  ): Promise<{ message: string; tutorResponse: string }> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      },
    )
    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to send message')
    }
    return await response.json()
  }

  async explainVocabulary(
    conversationId: string,
    word: string,
    context: string,
  ): Promise<{ explanation: string }> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/vocabulary`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context }),
      },
    )
    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to explain vocabulary')
    }
    return await response.json()
  }

  async findAll(): Promise<ConversationSummary[]> {
    const response = await fetch(`${this.baseUrl}/conversations`)
    if (!response.ok) throw new ServiceUnavailableError('Failed to list conversations')
    const data: { conversations: Array<{ id: string; title: string; createdAt: string }> } = await response.json()
    return data.conversations.map((c) => ({ id: c.id, title: c.title, createdAt: new Date(c.createdAt) }))
  }

  async getById(conversationId: string): Promise<Conversation> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}`,
    )
    if (response.status === 404) {
      throw new NotFoundError('Conversation not found')
    }
    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to get conversation')
    }
    const data: ConversationApiResponse = await response.json()
    return Conversation.fromApi(data)
  }
}

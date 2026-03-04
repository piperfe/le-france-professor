import type { ConversationApiResponse } from '../../domain/entities/conversation';
import { Conversation } from '../../domain/entities/conversation'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
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

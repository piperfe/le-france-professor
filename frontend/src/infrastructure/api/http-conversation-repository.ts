import { Conversation, ConversationApiResponse } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';

export class HttpConversationRepository implements ConversationRepository {
  constructor(private baseUrl: string) {}

  async create(): Promise<{ conversationId: string; initialMessage: string }> {
    const response = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return await response.json();
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
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return await response.json();
  }

  async getById(conversationId: string): Promise<Conversation> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}`,
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    const data: ConversationApiResponse = await response.json();
    return Conversation.fromApi(data);
  }
}

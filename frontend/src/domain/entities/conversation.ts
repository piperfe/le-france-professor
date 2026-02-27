import { Message } from './message';

export class Conversation {
  constructor(
    public readonly id: string,
    public readonly messages: Message[],
    public readonly createdAt: Date,
  ) {}

  static fromApi(data: ConversationApiResponse): Conversation {
    return new Conversation(
      data.id,
      data.messages.map((msg) => Message.fromApi(msg)),
      new Date(data.createdAt),
    );
  }

  addMessage(message: Message): Conversation {
    return new Conversation(this.id, [...this.messages, message], this.createdAt);
  }
}

export interface ConversationApiResponse {
  id: string;
  messages: Array<{
    id: string;
    content: string;
    sender: string;
    timestamp: string;
  }>;
  createdAt: string;
}

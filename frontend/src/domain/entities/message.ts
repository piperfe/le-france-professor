export type MessageType = 'chat' | 'vocabulary'

export class Message {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly sender: MessageSender,
    public readonly timestamp: Date,
    public readonly type: MessageType = 'chat',
    public readonly vocabularyWord?: string,
  ) {}

  static fromApi(data: MessageApiResponse): Message {
    return new Message(
      data.id,
      data.content,
      data.sender,
      new Date(data.timestamp),
    );
  }
}

export enum MessageSender {
  USER = 'user',
  TUTOR = 'tutor',
}

export interface MessageApiResponse {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: string;
}

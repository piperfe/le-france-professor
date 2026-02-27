export class Message {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly sender: MessageSender,
    public readonly timestamp: Date,
  ) {}

  static create(content: string, sender: MessageSender): Message {
    const id = this.generateId();
    const timestamp = new Date();
    return new Message(id, content, sender, timestamp);
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export enum MessageSender {
  USER = 'user',
  TUTOR = 'tutor',
}

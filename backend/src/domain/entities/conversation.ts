import { Message, MessageSender } from './message';

export class Conversation {
  constructor(
    public readonly id: string,
    private messages: Message[],
    public readonly createdAt: Date,
  ) {}

  static create(): Conversation {
    const id = this.generateId();
    const createdAt = new Date();
    return new Conversation(id, [], createdAt);
  }

  addMessage(message: Message): void {
    this.messages = [...this.messages, message];
  }

  getMessages(): readonly Message[] {
    return this.messages;
  }

  getLastMessage(): Message | null {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : null;
  }

  private static generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

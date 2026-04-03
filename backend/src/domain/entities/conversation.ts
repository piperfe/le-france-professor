import type { Message } from './message';
import { MessageSender } from './message';

const CALIBRATION_TURN_COUNT = 4;

export type ConversationPhase = 'calibration' | 'flow';

export class Conversation {
  constructor(
    public readonly id: string,
    private messages: Message[],
    public readonly createdAt: Date,
    public title: string | null = null,
    public topic: string | null = null,
  ) {}

  static create(): Conversation {
    const id = this.generateId();
    const createdAt = new Date();
    return new Conversation(id, [], createdAt);
  }

  addMessage(message: Message): void {
    this.messages = [...this.messages, message];
  }

  setTitle(title: string): void {
    this.title = title;
  }

  setTopic(topic: string): void {
    this.topic = topic;
  }

  isTitleGenerated(): boolean {
    return this.title !== null;
  }

  isTopicDiscovered(): boolean {
    return this.topic !== null;
  }

  userMessageCount(): number {
    return this.messages.filter((m) => m.sender === MessageSender.USER).length;
  }

  phase(): ConversationPhase {
    return this.userMessageCount() <= CALIBRATION_TURN_COUNT ? 'calibration' : 'flow';
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

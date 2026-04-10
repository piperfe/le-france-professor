import type { PhoneSessionRepository } from '../../domain/repositories/phone-session-repository';

export class InMemoryPhoneSessionRepository implements PhoneSessionRepository {
  private readonly sessions = new Map<string, string>();

  async findConversationId(phone: string): Promise<string | null> {
    return this.sessions.get(phone) ?? null;
  }

  async save(phone: string, conversationId: string): Promise<void> {
    this.sessions.set(phone, conversationId);
  }
}

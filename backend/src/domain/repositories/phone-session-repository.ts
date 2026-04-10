export interface PhoneSessionRepository {
  findConversationId(phone: string): Promise<string | null>;
  save(phone: string, conversationId: string): Promise<void>;
}

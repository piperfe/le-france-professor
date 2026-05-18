export interface PhoneSessionRepository {
  findByPhone(phone: string): Promise<string | null>;
  save(phone: string, conversationId: string): Promise<void>;
}

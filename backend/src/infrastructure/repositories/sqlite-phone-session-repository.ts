import { eq } from 'drizzle-orm'
import type { PhoneSessionRepository } from '../../domain/repositories/phone-session-repository'
import type { DrizzleDb } from '../db/client'
import { phoneSessions } from '../db/schema'

export class SqlitePhoneSessionRepository implements PhoneSessionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findConversationId(phone: string): Promise<string | null> {
    const row = this.db
      .select()
      .from(phoneSessions)
      .where(eq(phoneSessions.phoneNumber, phone))
      .get()
    return row?.conversationId ?? null
  }

  async save(phone: string, conversationId: string): Promise<void> {
    this.db.insert(phoneSessions)
      .values({ phoneNumber: phone, conversationId })
      .onConflictDoNothing()
      .run()
  }
}

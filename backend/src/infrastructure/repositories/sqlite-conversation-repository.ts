import { eq, asc } from 'drizzle-orm'
import { Conversation } from '../../domain/entities/conversation'
import { Message } from '../../domain/entities/message'
import type { MessageSender } from '../../domain/entities/message'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import type { DrizzleDb } from '../db/client'
import { conversations, messages } from '../db/schema'

type ConversationRow = typeof conversations.$inferSelect
type MessageRow = typeof messages.$inferSelect

function toConversation(row: ConversationRow, messageRows: MessageRow[]): Conversation {
  const msgs = messageRows.map(
    (m) => new Message(m.id, m.content, m.sender as MessageSender, m.timestamp),
  )
  return new Conversation(row.id, msgs, row.createdAt, row.title, row.topic)
}

export class SqliteConversationRepository implements ConversationRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(conversation: Conversation): Promise<void> {
    const msgs = conversation.getMessages()
    this.db.transaction((tx) => {
      tx.insert(conversations)
        .values({
          id: conversation.id,
          title: conversation.title,
          topic: conversation.topic,
          createdAt: conversation.createdAt,
        })
        .onConflictDoUpdate({
          target: conversations.id,
          set: { title: conversation.title, topic: conversation.topic },
        })
        .run()

      if (msgs.length > 0) {
        tx.insert(messages)
          .values(
            msgs.map((m) => ({
              id: m.id,
              conversationId: conversation.id,
              sender: m.sender,
              content: m.content,
              timestamp: m.timestamp,
            })),
          )
          .onConflictDoNothing()
          .run()
      }
    })
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = this.db.select().from(conversations).where(eq(conversations.id, id)).get()
    if (!row) return null
    const msgs = this.db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.timestamp))
      .all()
    return toConversation(row, msgs)
  }

  async findAll(): Promise<Conversation[]> {
    const rows = this.db.select().from(conversations)
      .orderBy(asc(conversations.createdAt))
      .all()
    return rows.map((row) => {
      const msgs = this.db.select().from(messages)
        .where(eq(messages.conversationId, row.id))
        .orderBy(asc(messages.timestamp))
        .all()
      return toConversation(row, msgs)
    })
  }
}

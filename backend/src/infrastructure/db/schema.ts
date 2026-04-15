import { sqliteTable, integer } from 'drizzle-orm/sqlite-core'

const createdAt = integer('created_at', { mode: 'timestamp' }).notNull()

export const conversations = sqliteTable('conversations', (t) => ({
  id: t.text().primaryKey(),
  title: t.text(),
  topic: t.text(),
  createdAt,
}))

export const messages = sqliteTable('messages', (t) => ({
  id: t.text().primaryKey(),
  conversationId: t.text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sender: t.text().notNull(),
  content: t.text().notNull(),
  timestamp: t.integer({ mode: 'timestamp' }).notNull(),
}))

export const vocabularyEntries = sqliteTable('vocabulary_entries', (t) => ({
  id: t.text().primaryKey(),
  conversationId: t.text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sourceMessageId: t.text('source_message_id').notNull(),
  word: t.text().notNull(),
  explanation: t.text().notNull(),
  createdAt,
}))

export const phoneSessions = sqliteTable('phone_sessions', (t) => ({
  phoneNumber: t.text('phone_number').primaryKey(),
  conversationId: t.text('conversation_id').notNull(),
}))

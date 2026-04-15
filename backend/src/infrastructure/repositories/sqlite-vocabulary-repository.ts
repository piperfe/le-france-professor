import { eq } from 'drizzle-orm'
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry'
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository'
import type { DrizzleDb } from '../db/client'
import { vocabularyEntries } from '../db/schema'

type VocabularyEntryRow = typeof vocabularyEntries.$inferSelect

function toVocabularyEntry(row: VocabularyEntryRow): VocabularyEntry {
  return new VocabularyEntry(
    row.id,
    row.word,
    row.explanation,
    row.sourceMessageId,
    row.conversationId,
    row.createdAt,
  )
}

export class SqliteVocabularyRepository implements VocabularyRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(entry: VocabularyEntry): Promise<void> {
    this.db.insert(vocabularyEntries).values({
      id: entry.id,
      conversationId: entry.conversationId,
      sourceMessageId: entry.sourceMessageId,
      word: entry.word,
      explanation: entry.explanation,
      createdAt: entry.createdAt,
    }).run()
  }

  async findByConversationId(conversationId: string): Promise<VocabularyEntry[]> {
    const rows = this.db
      .select()
      .from(vocabularyEntries)
      .where(eq(vocabularyEntries.conversationId, conversationId))
      .orderBy(vocabularyEntries.createdAt)
      .all()
    return rows.map(toVocabularyEntry)
  }
}

import type { VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import type { VocabularyRepository } from '../../domain/repositories/vocabulary-repository';

export class InMemoryVocabularyRepository implements VocabularyRepository {
  private entries: Map<string, VocabularyEntry[]> = new Map();

  async save(entry: VocabularyEntry): Promise<void> {
    const existing = this.entries.get(entry.conversationId) ?? [];
    this.entries.set(entry.conversationId, [...existing, entry]);
  }

  async findByConversationId(conversationId: string): Promise<VocabularyEntry[]> {
    return this.entries.get(conversationId) ?? [];
  }
}

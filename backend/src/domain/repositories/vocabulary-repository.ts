import type { VocabularyEntry } from '../entities/vocabulary-entry';

export interface VocabularyRepository {
  save(entry: VocabularyEntry): Promise<void>;
  findByConversationId(conversationId: string): Promise<VocabularyEntry[]>;
}

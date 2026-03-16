export class VocabularyEntry {
  constructor(
    public readonly id: string,
    public readonly word: string,
    public readonly explanation: string,
    public readonly sourceMessageId: string,
    public readonly conversationId: string,
    public readonly createdAt: Date,
  ) {}

  static create(
    word: string,
    explanation: string,
    sourceMessageId: string,
    conversationId: string,
  ): VocabularyEntry {
    return new VocabularyEntry(
      `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      word,
      explanation,
      sourceMessageId,
      conversationId,
      new Date(),
    );
  }
}

export interface VocabularyService {
  explainVocabulary(word: string, context: string): Promise<string>;
}

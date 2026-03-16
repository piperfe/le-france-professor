import { VocabularyEntry } from './vocabulary-entry';

describe('VocabularyEntry', () => {
  it('creates with all correct fields', () => {
    const entry = VocabularyEntry.create('passée', 'Explication.', 'msg-1', 'conv-1');
    expect(entry.word).toBe('passée');
    expect(entry.explanation).toBe('Explication.');
    expect(entry.sourceMessageId).toBe('msg-1');
    expect(entry.conversationId).toBe('conv-1');
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.id).toMatch(/^vocab-/);
  });

  it('generates a unique id each time', () => {
    const a = VocabularyEntry.create('mot', 'Expl.', 'msg-1', 'conv-1');
    const b = VocabularyEntry.create('mot', 'Expl.', 'msg-1', 'conv-1');
    expect(a.id).not.toBe(b.id);
  });
});

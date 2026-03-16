import { InMemoryVocabularyRepository } from './in-memory-vocabulary-repository';
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry';

describe('InMemoryVocabularyRepository', () => {
  let repository: InMemoryVocabularyRepository;

  beforeEach(() => {
    repository = new InMemoryVocabularyRepository();
  });

  it('saves and retrieves an entry for a conversation', async () => {
    const entry = VocabularyEntry.create('passée', 'Explication.', 'msg-1', 'conv-1');
    await repository.save(entry);

    const result = await repository.findByConversationId('conv-1');

    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('passée');
    expect(result[0].sourceMessageId).toBe('msg-1');
  });

  it('returns empty array for unknown conversation', async () => {
    const result = await repository.findByConversationId('unknown');
    expect(result).toEqual([]);
  });

  it('returns multiple entries in insertion order', async () => {
    await repository.save(VocabularyEntry.create('passée', 'Expl 1.', 'msg-1', 'conv-1'));
    await repository.save(VocabularyEntry.create('merci', 'Expl 2.', 'msg-2', 'conv-1'));

    const result = await repository.findByConversationId('conv-1');

    expect(result).toHaveLength(2);
    expect(result[0].word).toBe('passée');
    expect(result[1].word).toBe('merci');
  });

  it('does not return entries from other conversations', async () => {
    await repository.save(VocabularyEntry.create('passée', 'Expl.', 'msg-1', 'conv-1'));

    const result = await repository.findByConversationId('conv-2');

    expect(result).toEqual([]);
  });
});

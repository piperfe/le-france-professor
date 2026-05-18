import { createDatabase } from '../db/client'
import { SqliteVocabularyRepository } from './sqlite-vocabulary-repository'
import { SqliteConversationRepository } from './sqlite-conversation-repository'
import { VocabularyEntry } from '../../domain/entities/vocabulary-entry'
import { Conversation } from '../../domain/entities/conversation'

describe('SqliteVocabularyRepository', () => {
  let vocabulary: SqliteVocabularyRepository
  let conversations: SqliteConversationRepository

  beforeEach(async () => {
    const db = createDatabase(':memory:')
    conversations = new SqliteConversationRepository(db)
    vocabulary = new SqliteVocabularyRepository(db)
    await conversations.save(new Conversation('conv-1', [], new Date()))
  })

  describe('save', () => {
    it('persists vocabulary entry data', async () => {
      const entry = VocabularyEntry.create('passée', 'Explication.', 'msg-1', 'conv-1')
      await vocabulary.save(entry)

      const result = await vocabulary.findByConversationId('conv-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(entry.id)
      expect(result[0].word).toBe('passée')
      expect(result[0].explanation).toBe('Explication.')
      expect(result[0].sourceMessageId).toBe('msg-1')
      expect(result[0].conversationId).toBe('conv-1')
      expect(result[0].createdAt).toBeInstanceOf(Date)
    })
  })

  describe('findByConversationId', () => {
    it('returns empty array for unknown conversation', async () => {
      const result = await vocabulary.findByConversationId('unknown')
      expect(result).toEqual([])
    })

    it('returns entries in insertion order', async () => {
      const first = new VocabularyEntry('v1', 'passée', 'Expl 1.', 'msg-1', 'conv-1', new Date('2024-01-01T00:00:00.000Z'))
      const second = new VocabularyEntry('v2', 'merci', 'Expl 2.', 'msg-2', 'conv-1', new Date('2024-01-01T00:00:01.000Z'))
      await vocabulary.save(first)
      await vocabulary.save(second)

      const result = await vocabulary.findByConversationId('conv-1')

      expect(result).toHaveLength(2)
      expect(result[0].word).toBe('passée')
      expect(result[1].word).toBe('merci')
    })

    it('does not return entries from other conversations', async () => {
      await vocabulary.save(VocabularyEntry.create('passée', 'Expl.', 'msg-1', 'conv-1'))

      const result = await vocabulary.findByConversationId('conv-2')

      expect(result).toEqual([])
    })
  })
})

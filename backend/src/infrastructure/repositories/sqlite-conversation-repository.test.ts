import { createDatabase } from '../db/client'
import { SqliteConversationRepository } from './sqlite-conversation-repository'
import { Conversation } from '../../domain/entities/conversation'
import { Message, MessageSender } from '../../domain/entities/message'

describe('SqliteConversationRepository', () => {
  let repo: SqliteConversationRepository

  beforeEach(() => {
    repo = new SqliteConversationRepository(createDatabase(':memory:'))
  })

  describe('save', () => {
    it('persists conversation data', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(Message.create('Test', MessageSender.USER))
      await repo.save(conversation)

      const retrieved = await repo.findById(conversation.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(conversation.id)
      expect(retrieved?.getMessages()).toHaveLength(1)
      expect(retrieved?.getMessages()[0].content).toBe('Test')
      expect(retrieved?.getMessages()[0].sender).toBe(MessageSender.USER)
    })

    it('updates title and topic on subsequent save', async () => {
      const conversation = Conversation.create()
      await repo.save(conversation)

      conversation.setTitle('La cuisine française')
      conversation.setTopic('food')
      await repo.save(conversation)

      const retrieved = await repo.findById(conversation.id)
      expect(retrieved?.title).toBe('La cuisine française')
      expect(retrieved?.topic).toBe('food')
    })

    it('does not duplicate messages on repeated save', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(Message.create('Bonjour', MessageSender.USER))
      await repo.save(conversation)

      conversation.setTitle('Test')
      await repo.save(conversation)

      const retrieved = await repo.findById(conversation.id)
      expect(retrieved?.getMessages()).toHaveLength(1)
    })
  })

  describe('findById', () => {
    it('returns null for non-existent conversation', async () => {
      const result = await repo.findById('non-existent')
      expect(result).toBeNull()
    })

    it('returns messages in insertion order', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(Message.create('Premier', MessageSender.USER))
      conversation.addMessage(Message.create('Deuxième', MessageSender.TUTOR))
      conversation.addMessage(Message.create('Troisième', MessageSender.USER))
      await repo.save(conversation)

      const retrieved = await repo.findById(conversation.id)
      const msgs = retrieved?.getMessages() ?? []
      expect(msgs[0].content).toBe('Premier')
      expect(msgs[1].content).toBe('Deuxième')
      expect(msgs[2].content).toBe('Troisième')
    })
  })

  describe('findAll', () => {
    it('returns all saved conversations', async () => {
      const conv1 = Conversation.create()
      const conv2 = Conversation.create()
      await repo.save(conv1)
      await repo.save(conv2)

      const all = await repo.findAll()

      expect(all).toHaveLength(2)
      expect(all.map((c) => c.id)).toContain(conv1.id)
      expect(all.map((c) => c.id)).toContain(conv2.id)
    })

    it('returns empty array when no conversations exist', async () => {
      const all = await repo.findAll()
      expect(all).toEqual([])
    })
  })

  describe('getLastTutorMessage', () => {
    it('does not return student messages', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(Message.create('Message étudiant', MessageSender.USER))
      await repo.save(conversation)

      const result = await repo.getLastTutorMessage(conversation.id)

      expect(result).toBeNull()
    })

    it('returns the tutor message with all fields', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(Message.create('Bonjour', MessageSender.USER))
      const tutorMsg = Message.create('Salut !', MessageSender.TUTOR)
      conversation.addMessage(tutorMsg)
      await repo.save(conversation)

      const result = await repo.getLastTutorMessage(conversation.id)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(tutorMsg.id)
      expect(result?.content).toBe('Salut !')
      expect(result?.sender).toBe(MessageSender.TUTOR)
      expect(result?.timestamp).toBeInstanceOf(Date)
    })

    it('returns the most recent tutor message when multiple exist', async () => {
      const conversation = Conversation.create()
      conversation.addMessage(new Message('msg-1', 'Premier', MessageSender.TUTOR, new Date(1000)))
      const lastTutorMsg = new Message('msg-2', 'Deuxième', MessageSender.TUTOR, new Date(2000))
      conversation.addMessage(lastTutorMsg)
      await repo.save(conversation)

      const result = await repo.getLastTutorMessage(conversation.id)

      expect(result?.id).toBe(lastTutorMsg.id)
      expect(result?.content).toBe('Deuxième')
    })
  })
})

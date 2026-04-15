import { createDatabase } from '../db/client'
import { SqliteConversationRepository } from './sqlite-conversation-repository'
import { Conversation } from '../../domain/entities/conversation'
import { Message, MessageSender } from '../../domain/entities/message'

describe('SqliteConversationRepository', () => {
  let repo: SqliteConversationRepository

  beforeEach(() => {
    repo = new SqliteConversationRepository(createDatabase(':memory:'))
  })

  it('saves and retrieves a conversation', async () => {
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

  it('returns null for non-existent conversation', async () => {
    const result = await repo.findById('non-existent')
    expect(result).toBeNull()
  })

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

  it('preserves message order', async () => {
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

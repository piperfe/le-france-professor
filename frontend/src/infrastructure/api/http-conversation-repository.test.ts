import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpConversationRepository } from './http-conversation-repository'
import { MessageSender } from '../../domain/entities/message'
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors'

describe('HttpConversationRepository', () => {
  let repository: HttpConversationRepository
  const baseUrl = 'http://localhost:3001/api'

  beforeEach(() => {
    repository = new HttpConversationRepository(baseUrl)
    global.fetch = vi.fn()
  })

  it('should create a conversation', async () => {
    const mockResponse = { conversationId: 'conv-1', initialMessage: 'Bonjour !' }
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await repository.create()

    expect(result.conversationId).toBe('conv-1')
    expect(result.initialMessage).toBe('Bonjour !')
    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/conversations`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should throw ServiceUnavailableError when create fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response)

    await expect(repository.create()).rejects.toBeInstanceOf(ServiceUnavailableError)
  })

  it('should send a message', async () => {
    const mockResponse = { message: 'Hello', tutorResponse: 'Bonjour !' }
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await repository.sendMessage('conv-1', 'Hello')

    expect(result.tutorResponse).toBe('Bonjour !')
  })

  it('should get a conversation by id', async () => {
    const mockResponse = {
      id: 'conv-1',
      messages: [{ id: 'msg-1', content: 'Bonjour', sender: MessageSender.TUTOR, timestamp: '2024-01-01T00:00:00Z' }],
      createdAt: '2024-01-01T00:00:00Z',
    }
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const result = await repository.getById('conv-1')

    expect(result.id).toBe('conv-1')
    expect(result.messages).toHaveLength(1)
  })

  it('should throw NotFoundError when getById returns 404', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)

    await expect(repository.getById('bad-id')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('should throw ServiceUnavailableError when getById returns other error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response)

    await expect(repository.getById('conv-1')).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
})

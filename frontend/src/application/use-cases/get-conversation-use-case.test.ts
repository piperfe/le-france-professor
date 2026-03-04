import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetConversationUseCase } from './get-conversation-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors'
import { Conversation } from '../../domain/entities/conversation'

describe('GetConversationUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: GetConversationUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
    }
    useCase = new GetConversationUseCase(mockRepository)
  })

  it('should return ok with conversation when found', async () => {
    const conversation = Conversation.fromApi({
      id: 'conv-1',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
    })
    vi.mocked(mockRepository.getById).mockResolvedValue(conversation)

    const result = await useCase.execute('conv-1')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.id).toBe('conv-1')
    }
  })

  it('should return err with NotFoundError when repository throws NotFoundError', async () => {
    vi.mocked(mockRepository.getById).mockRejectedValue(new NotFoundError('Conversation not found'))

    const result = await useCase.execute('conv-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError)
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })

  it('should return err with ServiceUnavailableError when repository throws generic error', async () => {
    vi.mocked(mockRepository.getById).mockRejectedValue(new Error('DB connection failed'))

    const result = await useCase.execute('conv-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
      expect(result.error.message).toBe('DB connection failed')
    }
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateConversationUseCase } from './create-conversation-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('CreateConversationUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: CreateConversationUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      explainVocabulary: vi.fn(),
      getVocabulary: vi.fn(),
      findAll: vi.fn(),
    }
    useCase = new CreateConversationUseCase(mockRepository)
  })

  it('should return ok with conversationId and initialMessage', async () => {
    const expected = { conversationId: 'conv-1', initialMessage: 'Bonjour !' }
    vi.mocked(mockRepository.create).mockResolvedValue(expected)

    const result = await useCase.execute()

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.conversationId).toBe('conv-1')
      expect(result.value.initialMessage).toBe('Bonjour !')
    }
  })

  it('should return err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('Network error'))

    const result = await useCase.execute()

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
      expect(result.error.message).toBe('Network error')
    }
  })
})

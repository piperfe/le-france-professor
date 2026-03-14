import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetAllConversationsUseCase } from './get-all-conversations-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('GetAllConversationsUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: GetAllConversationsUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      explainVocabulary: vi.fn(),
      findAll: vi.fn(),
    }
    useCase = new GetAllConversationsUseCase(mockRepository)
  })

  it('returns ok with conversation summaries', async () => {
    const summaries = [
      { id: 'conv-1', title: 'Bonjour !', createdAt: new Date('2024-01-01') },
      { id: 'conv-2', title: 'Salut !', createdAt: new Date('2024-01-02') },
    ]
    vi.mocked(mockRepository.findAll).mockResolvedValue(summaries)

    const result = await useCase.execute()

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toEqual(summaries)
    }
  })

  it('returns ok with empty array when no conversations', async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue([])

    const result = await useCase.execute()

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toEqual([])
    }
  })

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('network error'))

    const result = await useCase.execute()

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('network error')
    }
  })

  it('passes through ServiceUnavailableError from repository', async () => {
    vi.mocked(mockRepository.findAll).mockRejectedValue(new ServiceUnavailableError('upstream down'))

    const result = await useCase.execute()

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe('upstream down')
    }
  })
})

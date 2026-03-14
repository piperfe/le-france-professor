import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SendMessageUseCase } from './send-message-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('SendMessageUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: SendMessageUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      explainVocabulary: vi.fn(),
      findAll: vi.fn(),
    }
    useCase = new SendMessageUseCase(mockRepository)
  })

  it('should return ok with tutorResponse', async () => {
    vi.mocked(mockRepository.sendMessage).mockResolvedValue({
      message: 'Hello',
      tutorResponse: 'Bonjour !',
    })

    const result = await useCase.execute('conv-1', 'Hello')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.tutorResponse).toBe('Bonjour !')
    }
  })

  it('should return err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.sendMessage).mockRejectedValue(new Error('LLM unavailable'))

    const result = await useCase.execute('conv-1', 'Hello')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
      expect(result.error.message).toBe('LLM unavailable')
    }
  })
})

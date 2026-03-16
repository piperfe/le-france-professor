import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExplainVocabularyUseCase } from './explain-vocabulary-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('ExplainVocabularyUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: ExplainVocabularyUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      explainVocabulary: vi.fn(),
      getVocabulary: vi.fn(),
      findAll: vi.fn(),
    }
    useCase = new ExplainVocabularyUseCase(mockRepository)
  })

  it('returns ok with explanation on success', async () => {
    vi.mocked(mockRepository.explainVocabulary).mockResolvedValue({
      explanation: '«Passée» est le participe passé féminin de «se passer».',
    })

    const result = await useCase.execute('conv-1', 'passée', "Comment s'est passée ta journée ?", 'msg-1')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.explanation).toBe('«Passée» est le participe passé féminin de «se passer».')
    }
  })

  it('forwards word, context and source message to the backend for explanation', async () => {
    vi.mocked(mockRepository.explainVocabulary).mockResolvedValue({ explanation: 'test' })

    await useCase.execute('conv-1', 'passée', "Comment s'est passée ta journée ?", 'msg-1')

    expect(mockRepository.explainVocabulary).toHaveBeenCalledWith(
      'conv-1',
      'passée',
      "Comment s'est passée ta journée ?",
      'msg-1',
    )
  })

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.explainVocabulary).mockRejectedValue(new Error('LLM unavailable'))

    const result = await useCase.execute('conv-1', 'passée', '', 'msg-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('LLM unavailable')
    }
  })

  it('preserves ServiceUnavailableError without double-wrapping', async () => {
    const original = new ServiceUnavailableError('already wrapped')
    vi.mocked(mockRepository.explainVocabulary).mockRejectedValue(original)

    const result = await useCase.execute('conv-1', 'passée', '', 'msg-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBe(original)
    }
  })
})

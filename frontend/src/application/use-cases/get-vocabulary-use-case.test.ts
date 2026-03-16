import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetVocabularyUseCase } from './get-vocabulary-use-case'
import type { ConversationRepository } from '../../domain/repositories/conversation-repository'
import type { VocabularyEntry } from '../../domain/entities/vocabulary-entry'
import { ServiceUnavailableError } from '../../domain/errors'

describe('GetVocabularyUseCase', () => {
  let mockRepository: ConversationRepository
  let useCase: GetVocabularyUseCase

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      explainVocabulary: vi.fn(),
      getVocabulary: vi.fn(),
      findAll: vi.fn(),
    }
    useCase = new GetVocabularyUseCase(mockRepository)
  })

  it('returns ok with vocabulary entries', async () => {
    const entries: VocabularyEntry[] = [
      { id: 'v-1', word: 'passée', explanation: 'Expl.', sourceMessageId: 'msg-1', conversationId: 'conv-1', createdAt: new Date() },
    ]
    vi.mocked(mockRepository.getVocabulary).mockResolvedValue(entries)

    const result = await useCase.execute('conv-1')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) expect(result.value).toEqual(entries)
  })

  it('returns ok with empty array when no entries', async () => {
    vi.mocked(mockRepository.getVocabulary).mockResolvedValue([])

    const result = await useCase.execute('conv-1')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) expect(result.value).toEqual([])
  })

  it('scopes entries to the given conversation', async () => {
    vi.mocked(mockRepository.getVocabulary).mockResolvedValue([])

    await useCase.execute('conv-42')

    expect(mockRepository.getVocabulary).toHaveBeenCalledWith('conv-42')
  })

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.getVocabulary).mockRejectedValue(new Error('network error'))

    const result = await useCase.execute('conv-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) expect(result.error).toBeInstanceOf(ServiceUnavailableError)
  })

  it('preserves ServiceUnavailableError without double-wrapping', async () => {
    const original = new ServiceUnavailableError('upstream down')
    vi.mocked(mockRepository.getVocabulary).mockRejectedValue(original)

    const result = await useCase.execute('conv-1')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) expect(result.error).toBe(original)
  })
})

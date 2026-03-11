import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SynthesizeSpeechUseCase } from './synthesize-speech-use-case'
import type { TtsRepository } from '../../domain/repositories/tts-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('SynthesizeSpeechUseCase', () => {
  let mockRepository: TtsRepository
  let useCase: SynthesizeSpeechUseCase
  const fakeAudio = new Blob(['wav-data'], { type: 'audio/wav' })

  beforeEach(() => {
    mockRepository = { synthesize: vi.fn() }
    useCase = new SynthesizeSpeechUseCase(mockRepository)
  })

  it('returns ok with the synthesized audio', async () => {
    vi.mocked(mockRepository.synthesize).mockResolvedValue({ audio: fakeAudio })

    const result = await useCase.execute('Bonjour !')

    expect(result.isOk()).toBe(true)
    if (result.isOk()) expect(result.value.audio).toBe(fakeAudio)
  })

  it('passes lengthScale through to the repository', async () => {
    vi.mocked(mockRepository.synthesize).mockResolvedValue({ audio: fakeAudio })

    await useCase.execute('Bonjour !', 1.5)

    expect(mockRepository.synthesize).toHaveBeenCalledWith('Bonjour !', 1.5)
  })

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.synthesize).mockRejectedValue(new Error('piper down'))

    const result = await useCase.execute('Bonjour !')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('piper down')
    }
  })

  it('preserves ServiceUnavailableError from repository', async () => {
    vi.mocked(mockRepository.synthesize).mockRejectedValue(
      new ServiceUnavailableError('synthesis service unavailable'),
    )

    const result = await useCase.execute('Bonjour !')

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('synthesis service unavailable')
    }
  })
})

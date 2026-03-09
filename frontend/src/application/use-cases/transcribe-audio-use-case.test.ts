import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TranscribeAudioUseCase } from './transcribe-audio-use-case'
import type { TranscriptionRepository } from '../../domain/repositories/transcription-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('TranscribeAudioUseCase', () => {
  let mockRepository: TranscriptionRepository
  let useCase: TranscribeAudioUseCase
  const fakeAudio = new Blob(['audio'], { type: 'audio/webm' })

  beforeEach(() => {
    mockRepository = { transcribe: vi.fn() }
    useCase = new TranscribeAudioUseCase(mockRepository)
  })

  it('returns ok with the transcribed text', async () => {
    vi.mocked(mockRepository.transcribe).mockResolvedValue({ text: 'Bonjour !' })

    const result = await useCase.execute(fakeAudio)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) expect(result.value.text).toBe('Bonjour !')
  })

  it('returns err with ServiceUnavailableError when repository throws', async () => {
    vi.mocked(mockRepository.transcribe).mockRejectedValue(new Error('whisper down'))

    const result = await useCase.execute(fakeAudio)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('whisper down')
    }
  })

  it('preserves ServiceUnavailableError from repository', async () => {
    vi.mocked(mockRepository.transcribe).mockRejectedValue(
      new ServiceUnavailableError('transcription service unavailable'),
    )

    const result = await useCase.execute(fakeAudio)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError)
      expect(result.error.message).toBe('transcription service unavailable')
    }
  })
})

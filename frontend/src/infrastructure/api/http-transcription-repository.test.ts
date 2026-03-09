import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpTranscriptionRepository } from './http-transcription-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('HttpTranscriptionRepository', () => {
  const whisperUrl = 'http://127.0.0.1:7600'
  const fakeAudio = new Blob(['audio'], { type: 'audio/webm' })
  const fakeWav = new Blob(['wav-data'], { type: 'audio/wav' })
  const mockConverter = vi.fn().mockResolvedValue(fakeWav)

  let repository: HttpTranscriptionRepository

  beforeEach(() => {
    repository = new HttpTranscriptionRepository(whisperUrl, mockConverter)
    global.fetch = vi.fn()
  })

  it('converts the audio before posting to whisper inference endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Bonjour !' }),
    } as Response)

    await repository.transcribe(fakeAudio)

    expect(mockConverter).toHaveBeenCalledWith(fakeAudio)
    expect(global.fetch).toHaveBeenCalledWith(
      `${whisperUrl}/inference`,
      expect.objectContaining({ method: 'POST' }),
    )
    const body = vi.mocked(global.fetch).mock.calls[0][1]?.body as FormData
    expect((body.get('file') as File).type).toBe('audio/wav')
    expect(body.get('language')).toBe('fr')
    expect(body.get('response_format')).toBe('json')
  })

  it('returns the transcribed text', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Bonjour !' }),
    } as Response)

    const result = await repository.transcribe(fakeAudio)

    expect(result.text).toBe('Bonjour !')
  })

  it('throws ServiceUnavailableError when whisper server responds with an error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response)

    await expect(repository.transcribe(fakeAudio)).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
})

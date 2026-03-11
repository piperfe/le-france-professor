// TODO: replace global.fetch mock with MSW (setupServer / http.post) for consistency
// with the component-layer tests. Currently uses global.fetch = vi.fn() like
// http-transcription-repository.test.ts — both should be migrated together.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpTtsRepository } from './http-tts-repository'
import { ServiceUnavailableError } from '../../domain/errors'

describe('HttpTtsRepository', () => {
  const ttsUrl = 'http://127.0.0.1:7602'
  const fakeWavBuffer = new ArrayBuffer(44)

  let repository: HttpTtsRepository

  beforeEach(() => {
    repository = new HttpTtsRepository(ttsUrl)
    global.fetch = vi.fn()
  })

  it('posts text to the piper root endpoint without length_scale when not provided', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakeWavBuffer,
    } as Response)

    await repository.synthesize('Bonjour !')

    expect(global.fetch).toHaveBeenCalledWith(
      `${ttsUrl}/`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Bonjour !' }),
      }),
    )
  })

  it('includes length_scale in the request body when provided', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakeWavBuffer,
    } as Response)

    await repository.synthesize('Bonjour !', 1.5)

    const body = vi.mocked(global.fetch).mock.calls[0][1]?.body as string
    expect(JSON.parse(body)).toEqual({ text: 'Bonjour !', length_scale: 1.5 })
  })

  it('returns a WAV blob with the synthesized audio', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakeWavBuffer,
    } as Response)

    const result = await repository.synthesize('Bonjour !')

    expect(result.audio).toBeInstanceOf(Blob)
    expect(result.audio.type).toBe('audio/wav')
    expect(result.audio.size).toBe(fakeWavBuffer.byteLength)
  })

  it('throws ServiceUnavailableError when piper server responds with an error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response)

    await expect(repository.synthesize('Bonjour !')).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
})

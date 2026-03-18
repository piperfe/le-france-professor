import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { HttpTtsRepository } from './http-tts-repository'
import { ServiceUnavailableError } from '../../domain/errors'

const TTS_URL = 'http://127.0.0.1:7602'
const fakeWavBuffer = new ArrayBuffer(44)

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HttpTtsRepository', () => {
  const repository = new HttpTtsRepository(TTS_URL)

  it('posts text to the piper root endpoint without length_scale when not provided', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post(`${TTS_URL}/`, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return new HttpResponse(fakeWavBuffer, { status: 200 })
      }),
    )

    await repository.synthesize('Bonjour !')

    expect(capturedBody).toEqual({ text: 'Bonjour !' })
  })

  it('includes length_scale in the request body when provided', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post(`${TTS_URL}/`, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return new HttpResponse(fakeWavBuffer, { status: 200 })
      }),
    )

    await repository.synthesize('Bonjour !', 1.5)

    expect(capturedBody).toEqual({ text: 'Bonjour !', length_scale: 1.5 })
  })

  it('returns a WAV blob with the synthesized audio', async () => {
    server.use(
      http.post(`${TTS_URL}/`, () => new HttpResponse(fakeWavBuffer, { status: 200 })),
    )

    const result = await repository.synthesize('Bonjour !')

    expect(result.audio).toBeInstanceOf(Blob)
    expect(result.audio.type).toBe('audio/wav')
    expect(result.audio.size).toBe(fakeWavBuffer.byteLength)
  })

  it('throws ServiceUnavailableError when piper server responds with an error', async () => {
    server.use(
      http.post(`${TTS_URL}/`, () => new HttpResponse(null, { status: 503 })),
    )

    await expect(repository.synthesize('Bonjour !')).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
})

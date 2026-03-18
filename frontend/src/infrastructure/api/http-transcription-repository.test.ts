import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { HttpTranscriptionRepository } from './http-transcription-repository'
import { ServiceUnavailableError } from '../../domain/errors'

const WHISPER_URL = 'http://127.0.0.1:7600'
const fakeAudio = new Blob(['audio'], { type: 'audio/webm' })
const fakeWav = new Blob(['wav-data'], { type: 'audio/wav' })
const mockConverter = vi.fn().mockResolvedValue(fakeWav)

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HttpTranscriptionRepository', () => {
  const repository = new HttpTranscriptionRepository(WHISPER_URL, mockConverter)

  it('converts the audio before posting to whisper inference endpoint', async () => {
    let capturedFormData: FormData | undefined
    server.use(
      http.post(`${WHISPER_URL}/inference`, async ({ request }) => {
        capturedFormData = await request.formData()
        return HttpResponse.json({ text: 'Bonjour !' })
      }),
    )

    await repository.transcribe(fakeAudio)

    expect(mockConverter).toHaveBeenCalledWith(fakeAudio)
    expect((capturedFormData!.get('file') as File).type).toBe('audio/wav')
    expect(capturedFormData!.get('language')).toBe('fr')
    expect(capturedFormData!.get('response_format')).toBe('json')
  })

  it('returns the transcribed text', async () => {
    server.use(
      http.post(`${WHISPER_URL}/inference`, () => HttpResponse.json({ text: 'Bonjour !' })),
    )

    const result = await repository.transcribe(fakeAudio)

    expect(result.text).toBe('Bonjour !')
  })

  it('throws ServiceUnavailableError when whisper server responds with an error', async () => {
    server.use(
      http.post(`${WHISPER_URL}/inference`, () => new HttpResponse(null, { status: 503 })),
    )

    await expect(repository.transcribe(fakeAudio)).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
})

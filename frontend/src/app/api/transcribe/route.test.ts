import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from 'neverthrow'
import type { NextRequest } from 'next/server'
import { ServiceUnavailableError } from '../../../domain/errors'

vi.mock('../../../lib/container', () => ({
  transcribeAudioUseCase: { execute: vi.fn() },
}))

import { POST } from './route'
import { transcribeAudioUseCase } from '../../../lib/container'

function makeRequest(audio?: Blob) {
  const form = new FormData()
  if (audio) form.append('audio', audio, 'recording.webm')
  return new Request('http://localhost/api/transcribe', { method: 'POST', body: form })
}

describe('POST /api/transcribe', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with transcribed text on success', async () => {
    vi.mocked(transcribeAudioUseCase.execute).mockResolvedValue(ok({ text: 'Bonjour !' }))

    const res = await POST(makeRequest(new Blob(['audio'])) as unknown as NextRequest)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'Bonjour !' })
  })

  it('returns 400 when audio field is missing', async () => {
    const res = await POST(makeRequest() as unknown as NextRequest)

    expect(res.status).toBe(400)
    expect(transcribeAudioUseCase.execute).not.toHaveBeenCalled()
  })

  it('returns 503 when use case fails', async () => {
    vi.mocked(transcribeAudioUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('whisper down')),
    )

    const res = await POST(makeRequest(new Blob(['audio'])) as unknown as NextRequest)

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'whisper down' })
  })
})

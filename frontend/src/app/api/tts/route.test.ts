import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from 'neverthrow'
import type { NextRequest } from 'next/server'
import { ServiceUnavailableError } from '../../../domain/errors'

vi.mock('../../../lib/container', () => ({
  synthesizeSpeechUseCase: { execute: vi.fn() },
}))

import { POST } from './route'
import { synthesizeSpeechUseCase } from '../../../lib/container'

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/tts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with WAV audio on success', async () => {
    const fakeWav = new Blob([new ArrayBuffer(44)], { type: 'audio/wav' })
    vi.mocked(synthesizeSpeechUseCase.execute).mockResolvedValue(ok({ audio: fakeWav }))

    const res = await POST(makeRequest({ text: 'Bonjour !' }) as unknown as NextRequest)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('audio/wav')
  })

  it('forwards lengthScale to the use case when provided', async () => {
    const fakeWav = new Blob([new ArrayBuffer(44)], { type: 'audio/wav' })
    vi.mocked(synthesizeSpeechUseCase.execute).mockResolvedValue(ok({ audio: fakeWav }))

    await POST(makeRequest({ text: 'Bonjour !', lengthScale: 1.5 }) as unknown as NextRequest)

    expect(synthesizeSpeechUseCase.execute).toHaveBeenCalledWith('Bonjour !', 1.5)
  })

  it('ignores non-numeric lengthScale values', async () => {
    const fakeWav = new Blob([new ArrayBuffer(44)], { type: 'audio/wav' })
    vi.mocked(synthesizeSpeechUseCase.execute).mockResolvedValue(ok({ audio: fakeWav }))

    await POST(makeRequest({ text: 'Bonjour !', lengthScale: 'fast' }) as unknown as NextRequest)

    expect(synthesizeSpeechUseCase.execute).toHaveBeenCalledWith('Bonjour !', undefined)
  })

  it('returns 400 when text field is missing', async () => {
    const res = await POST(makeRequest({}) as unknown as NextRequest)

    expect(res.status).toBe(400)
    expect(synthesizeSpeechUseCase.execute).not.toHaveBeenCalled()
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: 'not-json',
    })

    const res = await POST(req as unknown as NextRequest)

    expect(res.status).toBe(400)
    expect(synthesizeSpeechUseCase.execute).not.toHaveBeenCalled()
  })

  it('returns 503 when use case fails', async () => {
    vi.mocked(synthesizeSpeechUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('piper down')),
    )

    const res = await POST(makeRequest({ text: 'Bonjour !' }) as unknown as NextRequest)

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'piper down' })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ok, err } from 'neverthrow'
import { ServiceUnavailableError } from '../../../../../domain/errors'

vi.mock('../../../../../lib/container', () => ({
  explainVocabularyUseCase: { execute: vi.fn() },
}))

import { POST } from './route'
import { explainVocabularyUseCase } from '../../../../../lib/container'

describe('POST /api/conversations/[id]/vocabulary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with explanation on success', async () => {
    vi.mocked(explainVocabularyUseCase.execute).mockResolvedValue(
      ok({ explanation: '«Passée» est le participe passé féminin de «se passer».' }),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'passée', context: "Comment s'est passée ta journée ?" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.explanation).toBe('«Passée» est le participe passé féminin de «se passer».')
    expect(explainVocabularyUseCase.execute).toHaveBeenCalledWith(
      'conv-1',
      'passée',
      "Comment s'est passée ta journée ?",
    )
  })

  it('defaults context to empty string when not provided', async () => {
    vi.mocked(explainVocabularyUseCase.execute).mockResolvedValue(
      ok({ explanation: 'Bonjour est une salutation.' }),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'bonjour' }),
    })
    await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(explainVocabularyUseCase.execute).toHaveBeenCalledWith('conv-1', 'bonjour', '')
  })

  it('returns 400 when word is missing', async () => {
    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('word is required')
    expect(explainVocabularyUseCase.execute).not.toHaveBeenCalled()
  })

  it('returns 503 when use case fails', async () => {
    vi.mocked(explainVocabularyUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('LLM timeout')),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'passée', context: 'some phrase' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('LLM timeout')
  })
})

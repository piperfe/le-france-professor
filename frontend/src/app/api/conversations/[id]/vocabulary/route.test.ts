import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ok, err } from 'neverthrow'
import { ServiceUnavailableError } from '../../../../../domain/errors'
import type { VocabularyEntry } from '../../../../../domain/entities/vocabulary-entry'

vi.mock('../../../../../lib/container', () => ({
  explainVocabularyUseCase: { execute: vi.fn() },
  getVocabularyUseCase: { execute: vi.fn() },
}))

import { POST, GET } from './route'
import { explainVocabularyUseCase, getVocabularyUseCase } from '../../../../../lib/container'

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
      body: JSON.stringify({ word: 'passée', context: "Comment s'est passée ta journée ?", sourceMessageId: 'msg-1' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.explanation).toBe('«Passée» est le participe passé féminin de «se passer».')
    expect(explainVocabularyUseCase.execute).toHaveBeenCalledWith(
      'conv-1',
      'passée',
      "Comment s'est passée ta journée ?",
      'msg-1',
    )
  })

  it('defaults context and sourceMessageId to empty string when not provided', async () => {
    vi.mocked(explainVocabularyUseCase.execute).mockResolvedValue(
      ok({ explanation: 'Bonjour est une salutation.' }),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'bonjour' }),
    })
    await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(explainVocabularyUseCase.execute).toHaveBeenCalledWith('conv-1', 'bonjour', '', '')
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
      body: JSON.stringify({ word: 'passée', context: 'some phrase', sourceMessageId: 'msg-1' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('LLM timeout')
  })
})

describe('GET /api/conversations/[id]/vocabulary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with vocabulary list', async () => {
    const entries: VocabularyEntry[] = [
      { id: 'v-1', word: 'passée', explanation: 'Expl.', sourceMessageId: 'msg-1', conversationId: 'conv-1', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]
    vi.mocked(getVocabularyUseCase.execute).mockResolvedValue(ok(entries))

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary')
    const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.vocabulary).toEqual([
      { ...entries[0], createdAt: entries[0].createdAt.toISOString() },
    ])
    expect(getVocabularyUseCase.execute).toHaveBeenCalledWith('conv-1')
  })

  it('returns 200 with empty array when no entries', async () => {
    vi.mocked(getVocabularyUseCase.execute).mockResolvedValue(ok([]))

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary')
    const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.vocabulary).toEqual([])
  })

  it('returns 503 when use case fails', async () => {
    vi.mocked(getVocabularyUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('DB error')),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/vocabulary')
    const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(503)
  })
})

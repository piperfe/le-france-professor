import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from 'neverthrow'
import { ServiceUnavailableError } from '../../../domain/errors'

vi.mock('../../../lib/container', () => ({
  createConversationUseCase: { execute: vi.fn() },
  getAllConversationsUseCase: { execute: vi.fn() },
}))

import { GET, POST } from './route'
import { createConversationUseCase, getAllConversationsUseCase } from '../../../lib/container'

describe('GET /api/conversations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with conversations array on success', async () => {
    const summaries = [
      { id: 'conv-1', title: 'Bonjour !', createdAt: new Date('2024-01-01') },
    ]
    vi.mocked(getAllConversationsUseCase.execute).mockResolvedValue(ok(summaries))

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.conversations).toHaveLength(1)
    expect(body.conversations[0].id).toBe('conv-1')
  })

  it('returns 503 with error message when use case fails', async () => {
    vi.mocked(getAllConversationsUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('backend down')),
    )

    const res = await GET()

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('backend down')
  })
})

describe('POST /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 with conversationId and initialMessage on success', async () => {
    vi.mocked(createConversationUseCase.execute).mockResolvedValue(
      ok({ conversationId: 'conv-1', initialMessage: 'Bonjour !' }),
    )

    const res = await POST()

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.conversationId).toBe('conv-1')
    expect(body.initialMessage).toBe('Bonjour !')
  })

  it('returns 503 with error message when use case fails', async () => {
    vi.mocked(createConversationUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('LLM unavailable')),
    )

    const res = await POST()

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('LLM unavailable')
  })
})

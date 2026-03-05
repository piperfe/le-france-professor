import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from 'neverthrow'
import { ServiceUnavailableError } from '../../../domain/errors'

vi.mock('../../../lib/container', () => ({
  createConversationUseCase: { execute: vi.fn() },
}))

import { POST } from './route'
import { createConversationUseCase } from '../../../lib/container'

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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ok, err } from 'neverthrow'
import { ServiceUnavailableError } from '../../../../../domain/errors'

vi.mock('../../../../../lib/container', () => ({
  sendMessageUseCase: { execute: vi.fn() },
}))

import { POST } from './route'
import { sendMessageUseCase } from '../../../../../lib/container'

describe('POST /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with tutorResponse on success', async () => {
    vi.mocked(sendMessageUseCase.execute).mockResolvedValue(
      ok({ message: 'Bonjour', tutorResponse: 'Très bien !', messageId: 'msg-tutor-1' }),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bonjour' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tutorResponse).toBe('Très bien !')
    expect(body.messageId).toBe('msg-tutor-1')
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith('conv-1', 'Bonjour')
  })

  it('returns 503 with error message when use case fails', async () => {
    vi.mocked(sendMessageUseCase.execute).mockResolvedValue(
      err(new ServiceUnavailableError('LLM timeout')),
    )

    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bonjour' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'conv-1' }) })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('LLM timeout')
  })
})

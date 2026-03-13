import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { HttpConversationRepository } from './http-conversation-repository'
import { MessageSender } from '../../domain/entities/message'
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors'

const BASE_URL = 'http://localhost:3001/api'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HttpConversationRepository', () => {
  const repository = new HttpConversationRepository(BASE_URL)

  describe('create', () => {
    it('returns conversationId and initialMessage on success', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations`, () =>
          HttpResponse.json({ conversationId: 'conv-1', initialMessage: 'Bonjour !' }),
        ),
      )

      const result = await repository.create()

      expect(result.conversationId).toBe('conv-1')
      expect(result.initialMessage).toBe('Bonjour !')
    })

    it('throws ServiceUnavailableError on failure', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations`, () => new HttpResponse(null, { status: 503 })),
      )

      await expect(repository.create()).rejects.toBeInstanceOf(ServiceUnavailableError)
    })
  })

  describe('sendMessage', () => {
    it('returns tutorResponse on success', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations/conv-1/messages`, () =>
          HttpResponse.json({ message: 'Hello', tutorResponse: 'Bonjour !' }),
        ),
      )

      const result = await repository.sendMessage('conv-1', 'Hello')

      expect(result.tutorResponse).toBe('Bonjour !')
    })

    it('throws ServiceUnavailableError on failure', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations/conv-1/messages`, () =>
          new HttpResponse(null, { status: 503 }),
        ),
      )

      await expect(repository.sendMessage('conv-1', 'Hello')).rejects.toBeInstanceOf(ServiceUnavailableError)
    })
  })

  describe('getById', () => {
    it('returns a Conversation with messages on success', async () => {
      server.use(
        http.get(`${BASE_URL}/conversations/conv-1`, () =>
          HttpResponse.json({
            id: 'conv-1',
            messages: [
              { id: 'msg-1', content: 'Bonjour', sender: MessageSender.TUTOR, timestamp: '2024-01-01T00:00:00Z' },
            ],
            createdAt: '2024-01-01T00:00:00Z',
          }),
        ),
      )

      const result = await repository.getById('conv-1')

      expect(result.id).toBe('conv-1')
      expect(result.messages).toHaveLength(1)
    })

    it('throws NotFoundError on 404', async () => {
      server.use(
        http.get(`${BASE_URL}/conversations/bad-id`, () => new HttpResponse(null, { status: 404 })),
      )

      await expect(repository.getById('bad-id')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('throws ServiceUnavailableError on other errors', async () => {
      server.use(
        http.get(`${BASE_URL}/conversations/conv-1`, () => new HttpResponse(null, { status: 503 })),
      )

      await expect(repository.getById('conv-1')).rejects.toBeInstanceOf(ServiceUnavailableError)
    })
  })

  describe('explainVocabulary', () => {
    it('returns explanation on success', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations/conv-1/vocabulary`, () =>
          HttpResponse.json({ explanation: '«Passée» est le participe passé féminin de «se passer».' }),
        ),
      )

      const result = await repository.explainVocabulary('conv-1', 'passée', "Comment s'est passée ta journée ?")

      expect(result.explanation).toBe('«Passée» est le participe passé féminin de «se passer».')
    })

    it('sends word and context in the request body', async () => {
      let capturedBody: Record<string, unknown> | undefined
      server.use(
        http.post(`${BASE_URL}/conversations/conv-1/vocabulary`, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({ explanation: 'test' })
        }),
      )

      await repository.explainVocabulary('conv-1', 'passée', "Comment s'est passée ta journée ?")

      expect(capturedBody).toEqual({ word: 'passée', context: "Comment s'est passée ta journée ?" })
    })

    it('throws ServiceUnavailableError on failure', async () => {
      server.use(
        http.post(`${BASE_URL}/conversations/conv-1/vocabulary`, () =>
          new HttpResponse(null, { status: 503 }),
        ),
      )

      await expect(repository.explainVocabulary('conv-1', 'passée', '')).rejects.toBeInstanceOf(ServiceUnavailableError)
    })
  })
})

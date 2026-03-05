// Minimal stub backend for E2E tests — no Ollama required.
import { createServer } from 'node:http'

const CONVERSATION_ID = 'e2e-conv-1'
const INITIAL_MESSAGE = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
const TUTOR_RESPONSE = 'Très bien ! Continuons en français.'

const routes = {
  'GET /health': () => ({ status: 200, body: { ok: true } }),
  'POST /api/conversations': () => ({
    status: 201,
    body: { conversationId: CONVERSATION_ID, initialMessage: INITIAL_MESSAGE },
  }),
  [`GET /api/conversations/${CONVERSATION_ID}`]: () => ({
    status: 200,
    body: {
      id: CONVERSATION_ID,
      messages: [
        {
          id: 'msg-1',
          content: INITIAL_MESSAGE,
          sender: 'tutor',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
  }),
  [`POST /api/conversations/${CONVERSATION_ID}/messages`]: () => ({
    status: 200,
    body: { tutorResponse: TUTOR_RESPONSE },
  }),
}

const server = createServer((req, res) => {
  const key = `${req.method} ${req.url}`
  const handler = routes[key]

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `No stub for ${key}` }))
    return
  }

  const { status, body } = handler()
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
})

server.listen(3001, () => {
  console.log('E2E stub backend listening on http://localhost:3001')
})

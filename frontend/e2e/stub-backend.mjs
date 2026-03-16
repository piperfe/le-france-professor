// Minimal stub backend for E2E tests — no Ollama required.
// Fully stateful: each conversation is stored in a Map so message history
// persists within a test run and multiple conversations work independently.
import { createServer } from 'node:http'

const INITIAL_MESSAGE          = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
const TUTOR_RESPONSE           = 'Très bien ! Continuons en français.'
const VOCABULARY_EXPLANATION   = '«Passée» est le participe passé féminin du verbe «se passer» (to happen). En anglais : "happened".'

// conversation id → { id, messages[], createdAt }
const conversations = new Map()
// conversation id → VocabularyEntry[]
const vocabularies = new Map()
let convCounter = 0

function createConversation() {
  convCounter++
  const id = `e2e-conv-${convCounter}`
  conversations.set(id, {
    id,
    messages: [
      { id: 'msg-init', content: INITIAL_MESSAGE, sender: 'tutor', timestamp: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  })
  return id
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
  })
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const method   = req.method

  if (method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true })
  }

  if (method === 'GET' && pathname === '/api/conversations') {
    const list = Array.from(conversations.values()).map((conv) => {
      const firstTutor = conv.messages.find((m) => m.sender === 'tutor')
      const raw = firstTutor?.content ?? 'Nouvelle conversation'
      const title = raw.length > 40 ? raw.slice(0, 40).trimEnd() + '…' : raw
      return { id: conv.id, title, createdAt: conv.createdAt }
    })
    return send(res, 200, { conversations: list })
  }

  if (method === 'POST' && pathname === '/api/conversations') {
    const id = createConversation()
    return send(res, 201, { conversationId: id, initialMessage: INITIAL_MESSAGE })
  }

  const convMatch  = pathname.match(/^\/api\/conversations\/([^/]+)$/)
  const msgMatch   = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/)
  const vocabMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/vocabulary$/)

  if (method === 'GET' && convMatch) {
    const conv = conversations.get(convMatch[1])
    if (!conv) return send(res, 404, { error: 'Not found' })
    return send(res, 200, conv)
  }

  if (method === 'POST' && msgMatch) {
    const conv = conversations.get(msgMatch[1])
    if (!conv) return send(res, 404, { error: 'Not found' })
    const { message } = await readBody(req)
    const now = Date.now()
    const tutorMsgId = `msg-t-${now}`
    conv.messages.push(
      { id: `msg-u-${now}`, content: message,        sender: 'user',  timestamp: new Date().toISOString() },
      { id: tutorMsgId,     content: TUTOR_RESPONSE, sender: 'tutor', timestamp: new Date().toISOString() },
    )
    return send(res, 200, { tutorResponse: TUTOR_RESPONSE, messageId: tutorMsgId })
  }

  if (method === 'GET' && vocabMatch) {
    const entries = vocabularies.get(vocabMatch[1]) ?? []
    return send(res, 200, { vocabulary: entries })
  }

  if (method === 'POST' && vocabMatch) {
    const convId = vocabMatch[1]
    const { word, sourceMessageId } = await readBody(req)
    if (!vocabularies.has(convId)) vocabularies.set(convId, [])
    vocabularies.get(convId).push({
      id: `vocab-${Date.now()}`,
      word,
      explanation: VOCABULARY_EXPLANATION,
      sourceMessageId: sourceMessageId ?? '',
      conversationId: convId,
      createdAt: new Date().toISOString(),
    })
    return send(res, 200, { explanation: VOCABULARY_EXPLANATION })
  }

  send(res, 404, { error: `No stub for ${method} ${pathname}` })
})

server.listen(5101, () => {
  console.log('E2E stub backend listening on http://localhost:5101')
})

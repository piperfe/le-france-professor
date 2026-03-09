import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
import { ChatClient } from './chat-client'
import { MessageSender } from '../domain/entities/message'

// Minimal MediaRecorder stub so VoiceInputButton renders without errors
class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state = 'inactive'
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio']) })
    this.onstop?.()
  }
}

const CONVERSATION_ID = 'conv-1'
const MESSAGES_PATH = `/api/conversations/${CONVERSATION_ID}/messages`

const initialMessages = [
  {
    id: 'msg-0',
    content: 'Bonjour ! Comment puis-je vous aider ?',
    sender: MessageSender.TUTOR,
    timestamp: '2024-01-01T00:00:00Z',
  },
]

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
beforeEach(() => {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  })
})
afterEach(() => { server.resetHandlers(); vi.clearAllMocks(); vi.unstubAllGlobals() })
afterAll(() => server.close())

describe('ChatClient', () => {
  it('renders the initial messages passed as props', () => {
    render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} />)

    expect(screen.getByText('Bonjour ! Comment puis-je vous aider ?')).toBeInTheDocument()
  })

  it('disables the submit button when the input is empty', () => {
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)

    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  it('enables the submit button once the user types', async () => {
    const user = userEvent.setup()
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)

    await user.type(screen.getByRole('textbox'), 'Bonjour')

    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeDisabled()
  })

  it('shows the user message and loading indicator in flight, then the tutor response', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(MESSAGES_PATH, async () => {
        await delay(50)
        return HttpResponse.json({ tutorResponse: 'Très bien !' })
      }),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    // Optimistic updates are synchronous — visible right after click
    // delay(50) keeps the response pending long enough to observe the loading state
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
    expect(screen.getByText('Le tuteur écrit...')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Très bien !')).toBeInTheDocument())
    expect(screen.queryByText('Le tuteur écrit...')).not.toBeInTheDocument()
  })

  it('clears the input after submission', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(MESSAGES_PATH, () => HttpResponse.json({ tutorResponse: 'Oui !' })),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    // Input cleared synchronously before fetch — no waitFor needed
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('shows an error message on API failure', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(MESSAGES_PATH, () => new HttpResponse(null, { status: 503 })),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => {
      expect(
        screen.getByText("Erreur lors de l'envoi du message. Réessayez."),
      ).toBeInTheDocument()
    })
  })

  it('renders the mic button alongside the input', () => {
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)
    expect(screen.getByRole('button', { name: /enregistrement vocal/i })).toBeInTheDocument()
  })

  it('populates the input with the transcription text', async () => {
    server.use(
      http.post('/api/transcribe', () => HttpResponse.json({ text: 'Bonjour !' })),
    )
    const user = userEvent.setup()
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)

    await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
    await user.click(screen.getByRole('button', { name: /arrêter/i }))

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Bonjour !'))
  })

  it('sends the message body to the correct conversation endpoint', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> | undefined

    server.use(
      http.post(MESSAGES_PATH, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ tutorResponse: 'Oui !' })
      }),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(capturedBody).toEqual({ message: 'Bonjour' }))
  })
})

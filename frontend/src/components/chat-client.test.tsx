import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
import { ChatClient } from './chat-client'
import { MessageSender } from '../domain/entities/message'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

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
const VOCABULARY_PATH = `/api/conversations/${CONVERSATION_ID}/vocabulary`

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
    render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

    expect(screen.getByText('Bonjour ! Comment puis-je vous aider ?')).toBeInTheDocument()
  })

  it('disables the submit button when the input is empty', () => {
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  it('enables the submit button once the user types', async () => {
    const user = userEvent.setup()
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

    await user.type(screen.getByRole('textbox'), 'Bonjour')

    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeDisabled()
  })

  it('shows the user message and loading indicator in flight, then the tutor response', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(MESSAGES_PATH, async () => {
        await delay(50)
        return HttpResponse.json({ tutorResponse: 'Très bien !', messageId: 'msg-tutor-1' })
      }),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
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
      http.post(MESSAGES_PATH, () => HttpResponse.json({ tutorResponse: 'Oui !', messageId: 'msg-tutor-1' })),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
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

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => {
      expect(
        screen.getByText("Erreur lors de l'envoi du message. Réessayez."),
      ).toBeInTheDocument()
    })
  })

  it('renders the mic button alongside the input', () => {
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
    expect(screen.getByRole('button', { name: /enregistrement vocal/i })).toBeInTheDocument()
  })

  it('populates the input with the transcription text', async () => {
    server.use(
      http.post('/api/transcribe', () => HttpResponse.json({ text: 'Bonjour !' })),
    )
    const user = userEvent.setup()
    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

    await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
    await user.click(screen.getByRole('button', { name: /arrêter/i }))

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Bonjour !'))
  })

  describe('input placeholder during voice recording', () => {
    it('shows recording placeholder with 0s when mic starts', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))

      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Enregistrement… 0s')
    })

    describe('timer ticking', () => {
      beforeEach(() => { vi.useFakeTimers() })
      afterEach(() => { vi.useRealTimers() })

      it('increments the recording seconds in the placeholder', async () => {
        render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

        fireEvent.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
        await act(async () => {}) // flush getUserMedia microtask

        act(() => { vi.advanceTimersByTime(2000) })

        expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Enregistrement… 2s')
      })
    })

    it('shows transcribing placeholder while waiting for whisper', async () => {
      server.use(http.post('/api/transcribe', async () => {
        await delay(100)
        return HttpResponse.json({ text: 'Bonjour !' })
      }))
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))

      await waitFor(() =>
        expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Transcription en cours…')
      )
    })

    it('restores the default placeholder after transcription completes', async () => {
      server.use(http.post('/api/transcribe', () => HttpResponse.json({ text: 'Bonjour !' })))
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))

      await waitFor(() =>
        expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Tapez votre message en français…')
      )
    })
  })

  describe('/vocabulary slash command', () => {
    it('shows autocomplete popup when user types /', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/')

      expect(screen.getByText('/vocabulary')).toBeInTheDocument()
      expect(screen.getByText('Expliquer un mot en contexte')).toBeInTheDocument()
    })

    it('hides autocomplete once a space is typed after the command', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/vocabulary ')

      expect(screen.queryByText('Expliquer un mot en contexte')).not.toBeInTheDocument()
    })

    it('fills input with /vocabulary when autocomplete entry is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/')
      await user.click(screen.getByText('/vocabulary'))

      expect(screen.getByRole('textbox')).toHaveValue('/vocabulary ')
    })

    it('uses the last tutor message as context when looking up a word', async () => {
      const user = userEvent.setup()
      let capturedBody: Record<string, unknown> | undefined
      server.use(
        http.post(VOCABULARY_PATH, async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({ explanation: '«Passée» est le participe passé.' })
        }),
        http.get(VOCABULARY_PATH, () => HttpResponse.json({ vocabulary: [] })),
      )

      render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
      await user.type(screen.getByRole('textbox'), '/vocabulary passée')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      await waitFor(() =>
        expect(capturedBody).toEqual({
          word: 'passée',
          context: 'Bonjour ! Comment puis-je vous aider ?',
          sourceMessageId: 'msg-0',
        }),
      )
    })

    it('does not show user bubble — only the vocabulary response appears', async () => {
      const user = userEvent.setup()
      server.use(
        http.post(VOCABULARY_PATH, () =>
          HttpResponse.json({ explanation: '«Passée» est le participe passé.' }),
        ),
        http.get(VOCABULARY_PATH, () => HttpResponse.json({ vocabulary: [] })),
      )

      render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
      await user.type(screen.getByRole('textbox'), '/vocabulary passée')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      await waitFor(() => expect(screen.getByText('📖 passée')).toBeInTheDocument())
      expect(screen.queryByText('/vocabulary passée')).not.toBeInTheDocument()
      expect(screen.getByText('«Passée» est le participe passé.')).toBeInTheDocument()
    })

    it('shows "Analyse en cours…" while the vocabulary request is in flight', async () => {
      const user = userEvent.setup()
      server.use(
        http.post(VOCABULARY_PATH, async () => {
          await delay(50)
          return HttpResponse.json({ explanation: '«Passée» est le participe passé.' })
        }),
        http.get(VOCABULARY_PATH, () => HttpResponse.json({ vocabulary: [] })),
      )

      render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
      await user.type(screen.getByRole('textbox'), '/vocabulary passée')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      expect(screen.getByText('Analyse en cours…')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByText('Analyse en cours…')).not.toBeInTheDocument())
    })

    it('shows inline hint when /vocabulary is submitted without a word', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/vocabulary')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      expect(screen.getByText('Usage : /vocabulary [mot]')).toBeInTheDocument()
    })

    it('shows error for unknown slash command', async () => {
      const user = userEvent.setup()
      render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/unknown')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      expect(screen.getByText('Commande inconnue : /unknown')).toBeInTheDocument()
    })

    it('shows error when vocabulary API fails', async () => {
      const user = userEvent.setup()
      server.use(
        http.post(VOCABULARY_PATH, () => new HttpResponse(null, { status: 503 })),
      )

      render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
      await user.type(screen.getByRole('textbox'), '/vocabulary passée')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      await waitFor(() =>
        expect(screen.getByText('Erreur lors de la recherche du vocabulaire. Réessayez.')).toBeInTheDocument(),
      )
    })
  })

  describe('vocabulary notebook', () => {
    const savedEntry = {
      id: 'v-1',
      word: 'incontournable',
      explanation: "C'est un adjectif qui signifie essentiel.",
      sourceMessageId: 'msg-0',
      conversationId: CONVERSATION_ID,
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    it('shows badge count from initialVocabulary', () => {
      render(
        <ChatClient
          initialMessages={initialMessages}
          conversationId={CONVERSATION_ID}
          conversations={[]}
          initialVocabulary={[savedEntry]}
        />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('opens the drawer and shows saved words when badge is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ChatClient
          initialMessages={initialMessages}
          conversationId={CONVERSATION_ID}
          conversations={[]}
          initialVocabulary={[savedEntry]}
        />,
      )

      await user.click(screen.getByRole('button', { name: /carnet de vocabulaire/i }))

      expect(screen.getByText('incontournable')).toBeInTheDocument()
      expect(screen.getByText("C'est un adjectif qui signifie essentiel.")).toBeInTheDocument()
    })

    it('closes the drawer when the close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ChatClient
          initialMessages={initialMessages}
          conversationId={CONVERSATION_ID}
          conversations={[]}
          initialVocabulary={[savedEntry]}
        />,
      )

      await user.click(screen.getByRole('button', { name: /carnet de vocabulaire/i }))
      expect(screen.getByRole('button', { name: 'Fermer le carnet' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Fermer le carnet' }))

      expect(screen.queryByRole('button', { name: 'Fermer le carnet' })).not.toBeInTheDocument()
    })

    it('clicking a highlighted word opens the drawer with that word highlighted', async () => {
      const entryInMessage = {
        ...savedEntry,
        word: 'aider',        // appears in "Bonjour ! Comment puis-je vous aider ?"
        sourceMessageId: 'msg-0',
      }
      render(
        <ChatClient
          initialMessages={initialMessages}
          conversationId={CONVERSATION_ID}
          conversations={[]}
          initialVocabulary={[entryInMessage]}
        />,
      )

      fireEvent.click(screen.getByRole('mark'))

      // Drawer opens and shows the word entry
      expect(screen.getByRole('button', { name: 'Fermer le carnet' })).toBeInTheDocument()
      expect(screen.getAllByText('aider').length).toBeGreaterThan(0)
    })

    it('badge count increments after a /vocabulary command succeeds', async () => {
      const user = userEvent.setup()
      const newEntry = { ...savedEntry, id: 'v-2', word: 'passée' }
      server.use(
        http.post(VOCABULARY_PATH, () =>
          HttpResponse.json({ explanation: '«Passée» est le participe passé.' }),
        ),
        http.get(VOCABULARY_PATH, () =>
          HttpResponse.json({ vocabulary: [newEntry] }),
        ),
      )

      render(<ChatClient initialMessages={initialMessages} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)

      await user.type(screen.getByRole('textbox'), '/vocabulary passée')
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))

      await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    })
  })

  it('sends the message body to the correct conversation endpoint', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> | undefined

    server.use(
      http.post(MESSAGES_PATH, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ tutorResponse: 'Oui !', messageId: 'msg-tutor-1' })
      }),
    )

    render(<ChatClient initialMessages={[]} conversationId={CONVERSATION_ID} conversations={[]} initialVocabulary={[]} />)
    await user.type(screen.getByRole('textbox'), 'Bonjour')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(capturedBody).toEqual({ message: 'Bonjour' }))
  })
})

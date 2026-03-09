import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { VoiceInputButton } from './voice-input-button'

// ── MediaRecorder mock ────────────────────────────────────────────────────────
// Kept here: VoiceInputButton is the only consumer of MediaRecorder.
// stop() immediately fires ondataavailable + onstop to simulate a completed recording.

class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state = 'inactive'

  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

const fakeStream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterAll(() => server.close())

// ── setup / teardown ──────────────────────────────────────────────────────────
// matchMedia defaults to pointer: fine (desktop). Touch describe overrides it.

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  })
})

afterEach(() => {
  server.resetHandlers()
  vi.unstubAllGlobals()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('VoiceInputButton', () => {
  it('renders the mic button', () => {
    render(<VoiceInputButton onTranscription={vi.fn()} />)
    expect(screen.getByRole('button', { name: /enregistrement vocal/i })).toBeInTheDocument()
  })

  it('is disabled when the disabled prop is true', () => {
    render(<VoiceInputButton onTranscription={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /enregistrement vocal/i })).toBeDisabled()
  })

  describe('on desktop device (pointer: fine)', () => {
    // matchMedia returns { matches: false } from the outer beforeEach — desktop mode.

    it('shows recording state while mic is active', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))

      expect(screen.getByRole('button', { name: /arrêter/i })).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls onTranscription with the transcribed text after stopping', async () => {
      server.use(http.post('/api/transcribe', () => HttpResponse.json({ text: 'Bonjour !' })))
      const onTranscription = vi.fn()
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={onTranscription} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))

      await waitFor(() => expect(onTranscription).toHaveBeenCalledWith('Bonjour !'))
    })

    it('shows error alert when transcription service fails', async () => {
      server.use(http.post('/api/transcribe', () => new HttpResponse(null, { status: 503 })))
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('La transcription a échoué'),
      )
    })

    it('shows error alert when transcription returns empty text', async () => {
      server.use(http.post('/api/transcribe', () => HttpResponse.json({ text: '   ' })))
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Aucune parole détectée'),
      )
    })

    it('shows error alert when microphone permission is denied', async () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
        },
      })
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Accès au microphone refusé'),
      )
    })

    it('shows error alert when mic device is unavailable', async () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Device not found')),
        },
      })
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent("Impossible d'accéder au microphone"),
      )
    })

    it('clears the error alert when retry is clicked', async () => {
      server.use(http.post('/api/transcribe', () => new HttpResponse(null, { status: 503 })))
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))
      await user.click(screen.getByRole('button', { name: /arrêter/i }))
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: /réessayer/i }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('on touch device (pointer: coarse)', () => {
    beforeEach(() => {
      // Overrides the outer beforeEach — matchMedia returns true for (pointer: coarse).
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({ matches: true }),
      })
    })

    it('touchstart starts recording, touchend stops and transcribes', async () => {
      server.use(http.post('/api/transcribe', () => HttpResponse.json({ text: 'Bonjour !' })))
      const onTranscription = vi.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)

      const button = screen.getByRole('button', { name: /enregistrement vocal/i })
      fireEvent.touchStart(button)

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /arrêter/i })).toHaveAttribute('aria-pressed', 'true'),
      )

      fireEvent.touchEnd(button)

      await waitFor(() => expect(onTranscription).toHaveBeenCalledWith('Bonjour !'))
    })

    it('click does nothing on a touch device', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
      const user = userEvent.setup()
      render(<VoiceInputButton onTranscription={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /enregistrement vocal/i }))

      expect(getUserMedia).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /enregistrement vocal/i })).toBeInTheDocument()
    })
  })
})

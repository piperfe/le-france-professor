import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { TtsButton } from './tts-button'

// ── Audio mock ────────────────────────────────────────────────────────────────
// Kept here: TtsButton is the only consumer of HTMLAudioElement for TTS.
// play() resolves immediately; onended must be triggered manually in tests.

class MockAudio {
  playbackRate = 1
  onended: (() => void) | null = null
  pause = vi.fn()
  play = vi.fn().mockResolvedValue(undefined)
}

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterAll(() => server.close())

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio)
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn().mockReturnValue('blob:mock-url') })
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() })
})

afterEach(() => {
  server.resetHandlers()
  vi.unstubAllGlobals()
})

// ── helpers ───────────────────────────────────────────────────────────────────

function fakeWavResponse() {
  return new HttpResponse(new ArrayBuffer(44), {
    headers: { 'Content-Type': 'audio/wav' },
  })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('TtsButton', () => {
  it('shows a speaker button and a slow-play button', () => {
    render(<TtsButton text="Bonjour !" />)

    expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /écouter lentement/i })).toBeInTheDocument()
  })

  it('disables the speaker button while audio is being prepared', async () => {
    server.use(http.post('/api/tts', async () => {
      await new Promise((r) => setTimeout(r, 50))
      return fakeWavResponse()
    }))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    user.click(screen.getByRole('button', { name: /écouter en français/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeDisabled(),
    )
  })

  it('shows a stop button once audio starts playing', async () => {
    server.use(http.post('/api/tts', () => fakeWavResponse()))
    render(<TtsButton text="Bonjour !" />)

    // fireEvent + act flushes the async fetchAndPlay microtasks (including await audio.play())
    fireEvent.click(screen.getByRole('button', { name: /écouter en français/i }))
    await act(async () => {})

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /arrêter la lecture/i })).toBeInTheDocument(),
    )
  })

  it('returns to speaker button when stop is clicked', async () => {
    server.use(http.post('/api/tts', () => fakeWavResponse()))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    await user.click(screen.getByRole('button', { name: /écouter en français/i }))
    await waitFor(() => screen.getByRole('button', { name: /arrêter la lecture/i }))

    await user.click(screen.getByRole('button', { name: /arrêter la lecture/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument(),
    )
  })

  it('the turtle button becomes the active control while slow audio plays', async () => {
    server.use(http.post('/api/tts', () => fakeWavResponse()))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    await user.click(screen.getByRole('button', { name: /écouter lentement/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /arrêter la lecture lente/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument()
    })
  })

  it('sends lengthScale 1.5 to the BFF when the slow button is clicked', async () => {
    let capturedBody: unknown = null
    server.use(http.post('/api/tts', async ({ request }) => {
      capturedBody = await request.json()
      return fakeWavResponse()
    }))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    await user.click(screen.getByRole('button', { name: /écouter lentement/i }))

    await waitFor(() => expect(capturedBody).toMatchObject({ lengthScale: 1.5 }))
  })

  it('shows the speaker button again after audio finishes', async () => {
    let capturedAudio: MockAudio | null = null
    vi.stubGlobal('Audio', class extends MockAudio {
      constructor(_url: string) {
        super()
        capturedAudio = this
      }
    })

    server.use(http.post('/api/tts', () => fakeWavResponse()))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    await user.click(screen.getByRole('button', { name: /écouter en français/i }))
    await waitFor(() => screen.getByRole('button', { name: /arrêter la lecture/i }))

    capturedAudio!.onended?.()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument(),
    )
  })

  it('shows the speaker button when the audio service is unavailable', async () => {
    server.use(http.post('/api/tts', () => new HttpResponse(null, { status: 503 })))
    const user = userEvent.setup()
    render(<TtsButton text="Bonjour !" />)

    await user.click(screen.getByRole('button', { name: /écouter en français/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument(),
    )
  })

  describe('with multiple instances in a conversation', () => {
    // Renders two TtsButtons side by side — simulates a conversation with two tutor responses.
    // Tests the module-level singleton: only one audio plays at a time.

    it('stops the first message and resets its button when the second message starts playing', async () => {
      const audios: MockAudio[] = []
      vi.stubGlobal('Audio', class extends MockAudio {
        constructor(_url: string) { super(); audios.push(this) }
      })

      server.use(http.post('/api/tts', () => fakeWavResponse()))
      const user = userEvent.setup()

      render(
        <>
          <TtsButton text="Première réponse du tuteur" />
          <TtsButton text="Deuxième réponse du tuteur" />
        </>,
      )

      const speakers = screen.getAllByRole('button', { name: /écouter en français/i })

      // Play message 1
      await user.click(speakers[0])
      await waitFor(() => expect(audios[0]?.play).toHaveBeenCalled())

      // Play message 2 — message 1 must stop
      await user.click(speakers[1])

      await waitFor(() => {
        expect(audios[0].pause).toHaveBeenCalled()  // message 1 was paused
        expect(audios[1]?.play).toHaveBeenCalled()   // message 2 started
      })

      // Message 1's button reverted to speaker; message 2's button shows stop
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /écouter en français/i })).toHaveLength(1)
        expect(screen.getByRole('button', { name: /arrêter la lecture/i })).toBeInTheDocument()
      })
    })

    it('switches directly from normal to slow speed on the same message without an extra click', async () => {
      const audios: MockAudio[] = []
      vi.stubGlobal('Audio', class extends MockAudio {
        constructor(_url: string) { super(); audios.push(this) }
      })

      const requestBodies: unknown[] = []
      server.use(http.post('/api/tts', async ({ request }) => {
        requestBodies.push(await request.json())
        return fakeWavResponse()
      }))
      const user = userEvent.setup()

      render(<TtsButton text="Bonjour !" />)

      // Start normal playback
      await user.click(screen.getByRole('button', { name: /écouter en français/i }))
      await waitFor(() => expect(audios[0]?.play).toHaveBeenCalled())

      // Click slow — should switch directly, no stop click required
      await user.click(screen.getByRole('button', { name: /écouter lentement/i }))

      await waitFor(() => {
        expect(audios[0].pause).toHaveBeenCalled()  // normal audio stopped
        expect(audios[1]?.play).toHaveBeenCalled()   // slow audio started
      })
      // Slow request sent with lengthScale 1.5 — speed controlled server-side by Piper
      expect(requestBodies[1]).toMatchObject({ lengthScale: 1.5 })
      // Speaker reverts to idle; turtle becomes the active control
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /arrêter la lecture lente/i })).toBeInTheDocument()
      })
    })
  })
})

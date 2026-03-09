import { test, expect } from '@playwright/test'

// Conversation ID returned by the stub backend
const CONVERSATION_ID = 'e2e-conv-1'
const INITIAL_MESSAGE = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
const TUTOR_RESPONSE = 'Très bien ! Continuons en français.'

test('full conversation flow: start → receive greeting → send message → receive reply', async ({ page }) => {
  // 1. Home page
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Le France Professor' })).toBeVisible()

  // 2. Start conversation — navigates to the conversation page
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(`/conversation/${CONVERSATION_ID}`)

  // 3. Tutor's initial greeting rendered by the RSC page
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  // 4. Send a message
  await page.getByRole('textbox').fill('Bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  // 5. User message appears optimistically
  await expect(page.getByText('Bonjour', { exact: true })).toBeVisible()

  // 6. Tutor reply arrives
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()
})

test('voice input flow on desktop: click mic → transcription appears in input box → send', async ({ page, context }) => {
  // Grant microphone permission so the browser does not block getUserMedia
  await context.grantPermissions(['microphone'])

  // Inject a fake MediaRecorder + getUserMedia before any page script runs.
  // This simulates a recording that immediately produces an audio blob on stop().
  await page.addInitScript(() => {
    const fakeStream = { getTracks: () => [{ stop: () => {} }] }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(fakeStream) },
      writable: true,
    })

    class FakeMediaRecorder {
      static isTypeSupported() { return true }
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
    // @ts-ignore
    window.MediaRecorder = FakeMediaRecorder
  })

  // Mock the BFF transcribe endpoint — no real whisper.cpp needed
  await page.route('/api/transcribe', (route) =>
    route.fulfill({ json: { text: 'Je voudrais un café' } }),
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(`/conversation/${CONVERSATION_ID}`)

  // Click mic to start, click again to stop
  await page.getByRole('button', { name: /enregistrement vocal/i }).click()
  await page.getByRole('button', { name: /arrêter/i }).click()

  // Transcription appears in the input box
  await expect(page.getByRole('textbox')).toHaveValue('Je voudrais un café')

  // Student sends it
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Je voudrais un café', { exact: true })).toBeVisible()
})

test('voice input flow on mobile: touchstart/touchend (press-and-hold) → transcription → send', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])

  await page.addInitScript(() => {
    // Simulate coarse pointer (touch device) so the component uses press-and-hold mode
    const _orig = window.matchMedia.bind(window)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        if (query === '(pointer: coarse)') {
          return { matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }
        }
        return _orig(query)
      },
    })

    const fakeStream = { getTracks: () => [{ stop: () => {} }] }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(fakeStream) },
      writable: true,
    })

    class FakeMediaRecorder {
      static isTypeSupported() { return true }
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
    // @ts-ignore
    window.MediaRecorder = FakeMediaRecorder
  })

  await page.route('/api/transcribe', (route) =>
    route.fulfill({ json: { text: 'Je voudrais parler français' } }),
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(`/conversation/${CONVERSATION_ID}`)

  // Press-and-hold: touchstart starts recording, touchend stops and transcribes.
  // The button's aria-label changes from "enregistrement vocal" to "arrêter" while recording,
  // so we re-query it by its new label before dispatching touchend.
  await page.getByRole('button', { name: /enregistrement vocal/i }).dispatchEvent('touchstart', { bubbles: true, cancelable: true })
  await expect(page.getByRole('button', { name: /arrêter/i })).toBeVisible()

  await page.getByRole('button', { name: /arrêter/i }).dispatchEvent('touchend', { bubbles: true })

  await expect(page.getByRole('textbox')).toHaveValue('Je voudrais parler français')

  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Je voudrais parler français', { exact: true })).toBeVisible()
})

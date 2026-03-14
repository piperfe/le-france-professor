import { test, expect } from '@playwright/test'

const INITIAL_MESSAGE = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
const TUTOR_RESPONSE  = 'Très bien ! Continuons en français.'

// ── helpers ───────────────────────────────────────────────────────────────────

async function startConversation(page: ReturnType<typeof test['info']> extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('full conversation flow: start → receive greeting → send message → receive reply', async ({ page }) => {
  await startConversation(page)

  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  await page.getByRole('textbox').fill('Bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('Bonjour', { exact: true })).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()
})

test('voice input flow on desktop: click mic → transcription appears in input box → send', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])

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

  await page.route('/api/transcribe', (route) =>
    route.fulfill({ json: { text: 'Je voudrais un café' } }),
  )

  await startConversation(page)

  await page.getByRole('button', { name: /enregistrement vocal/i }).click()
  await expect(page.getByRole('textbox')).toHaveAttribute('placeholder', 'Enregistrement… 0s')

  await page.getByRole('button', { name: /arrêter/i }).click()

  await expect(page.getByRole('textbox')).toHaveValue('Je voudrais un café')

  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Je voudrais un café', { exact: true })).toBeVisible()
})

test('tts: speaker and slow-play buttons appear below each tutor message', async ({ page }) => {
  await startConversation(page)

  await expect(page.getByRole('button', { name: /écouter en français/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /écouter lentement/i })).toBeVisible()
})

test('tts: clicking the speaker button plays the tutor response then stop returns to speaker', async ({ page }) => {
  await page.addInitScript(() => {
    URL.createObjectURL = () => 'blob:mock-url'
    URL.revokeObjectURL = () => {}

    class FakeAudio {
      constructor(_url: string) {}
      playbackRate = 1
      onended: (() => void) | null = null
      pause() {}
      play() { return Promise.resolve() }
    }
    // @ts-ignore
    window.Audio = FakeAudio
  })

  await page.route('/api/tts', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.alloc(44) }),
  )

  await startConversation(page)

  await page.getByRole('button', { name: /écouter en français/i }).click()
  await expect(page.getByRole('button', { name: /arrêter la lecture/i })).toBeVisible()

  await page.getByRole('button', { name: /arrêter la lecture/i }).click()
  await expect(page.getByRole('button', { name: /écouter en français/i })).toBeVisible()
})

test('tts: slow button sends lengthScale 1.5 to the BFF', async ({ page }) => {
  await page.addInitScript(() => {
    URL.createObjectURL = () => 'blob:mock-url'
    URL.revokeObjectURL = () => {}

    class FakeAudio {
      constructor(_url: string) {}
      playbackRate = 1
      onended: (() => void) | null = null
      pause() {}
      play() { return Promise.resolve() }
    }
    // @ts-ignore
    window.Audio = FakeAudio
  })

  let capturedBody: unknown = null
  await page.route('/api/tts', async (route) => {
    capturedBody = await route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.alloc(44) })
  })

  await startConversation(page)

  await page.getByRole('button', { name: /écouter lentement/i }).click()
  await expect(page.getByRole('button', { name: /arrêter la lecture/i })).toBeVisible()

  expect(capturedBody).toMatchObject({ lengthScale: 1.5 })
})

test('tts: clicking a second message stops the first', async ({ page }) => {
  await page.addInitScript(() => {
    URL.createObjectURL = () => 'blob:mock-url'
    URL.revokeObjectURL = () => {}

    class FakeAudio {
      constructor(_url: string) {}
      playbackRate = 1
      onended: (() => void) | null = null
      pause() {}
      play() { return Promise.resolve() }
    }
    // @ts-ignore
    window.Audio = FakeAudio
  })

  await page.route('/api/tts', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.alloc(44) }),
  )

  await startConversation(page)

  await page.getByRole('textbox').fill('Bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  const speakers = page.getByRole('button', { name: /écouter en français/i })
  await expect(speakers).toHaveCount(2)

  await speakers.first().click()
  await expect(page.getByRole('button', { name: /arrêter la lecture/i })).toHaveCount(1)

  await speakers.last().click()
  await expect(page.getByRole('button', { name: /arrêter la lecture/i })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /écouter en français/i })).toHaveCount(1)
})

test('/vocabulary: autocomplete popup appears when typing /', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').type('/')

  await expect(page.getByText('/vocabulary')).toBeVisible()
  await expect(page.getByText('Expliquer un mot en contexte')).toBeVisible()
})

test('/vocabulary: full flow — bubble with word header and explanation appears', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary passée')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('/vocabulary passée', { exact: true })).not.toBeVisible()
  await expect(page.getByText('📖 passée')).toBeVisible()
  await expect(page.getByText('«Passée» est le participe passé féminin du verbe «se passer» (to happen). En anglais : "happened".')).toBeVisible()
})

test('/vocabulary: shows inline hint when submitted without a word', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('Usage : /vocabulary [mot]')).toBeVisible()
})

test('voice input flow on mobile: touchstart/touchend (press-and-hold) → transcription → send', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])

  await page.addInitScript(() => {
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

  await startConversation(page)

  await page.getByRole('button', { name: /enregistrement vocal/i }).dispatchEvent('touchstart', { bubbles: true, cancelable: true })
  await expect(page.getByRole('button', { name: /arrêter/i })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveAttribute('placeholder', 'Enregistrement… 0s')

  await page.getByRole('button', { name: /arrêter/i }).dispatchEvent('touchend', { bubbles: true })

  await expect(page.getByRole('textbox')).toHaveValue('Je voudrais parler français')

  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Je voudrais parler français', { exact: true })).toBeVisible()
})

test('sidebar: create conv1, send message, open conv2 via sidebar, send message, navigate back to conv1', async ({ page }) => {
  // ── Conv 1 ────────────────────────────────────────────────────────────────
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
  const conv1Url = page.url()

  // Tutor greeting appears
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  // Sidebar shows the conversation title (at least once — other tests may have left entries)
  const expectedTitle = INITIAL_MESSAGE.slice(0, 40).trimEnd() + '…'
  await expect(page.locator('.hidden.md\\:flex').getByText(expectedTitle).first()).toBeVisible()

  // Send a message in conv1
  await page.getByRole('textbox').fill('Bonjour depuis conv1 !')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Bonjour depuis conv1 !')).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  // ── Conv 2 — created from sidebar ────────────────────────────────────────
  await page.getByRole('button', { name: '+ Nouvelle conversation' }).click()
  await page.waitForURL((url) => url.toString() !== conv1Url)
  const conv2Url = page.url()

  // Fresh greeting — conv1 messages are gone
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()
  await expect(page.getByText('Bonjour depuis conv1 !')).not.toBeVisible()

  // Send a message in conv2
  await page.getByRole('textbox').fill('Bonjour depuis conv2 !')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Bonjour depuis conv2 !')).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  // After creating conv2, the sidebar must show more entries than it did for conv1 alone
  // (conv1's entry is now joined by conv2's — plus any from parallel tests)
  const countAfterConv2 = await page.locator('.hidden.md\\:flex').getByText(expectedTitle).count()
  expect(countAfterConv2).toBeGreaterThanOrEqual(2)

  // ── Navigate back to conv1 ────────────────────────────────────────────────
  // Use direct URL navigation — equivalent to sidebar click (both load the server component)
  await page.goto(conv1Url)
  await page.waitForURL(conv1Url)

  // Conv1 messages are restored from the server (stub persists them)
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()
  await expect(page.getByText('Bonjour depuis conv1 !')).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  // Conv2 messages are not present
  await expect(page.getByText('Bonjour depuis conv2 !')).not.toBeVisible()

  // Can still write in conv1
  await page.getByRole('textbox').fill('Je suis de retour !')
  await expect(page.getByRole('textbox')).toHaveValue('Je suis de retour !')
})

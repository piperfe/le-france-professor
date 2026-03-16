import type { Page } from '@playwright/test'

export const INITIAL_MESSAGE        = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
export const TUTOR_RESPONSE         = 'Très bien ! Continuons en français.'
export const VOCABULARY_EXPLANATION = '«Passée» est le participe passé féminin du verbe «se passer» (to happen). En anglais : "happened".'

export async function startConversation(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
}

export async function addFakeAudio(page: Page) {
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
}

export async function addFakeMediaRecorder(page: Page) {
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
}

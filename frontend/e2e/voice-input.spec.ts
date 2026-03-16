import { test, expect } from '@playwright/test'
import { startConversation, addFakeMediaRecorder } from './helpers'

test('voice input flow on desktop: click mic → transcription appears in input box → send', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])
  await addFakeMediaRecorder(page)

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
  })
  await addFakeMediaRecorder(page)

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

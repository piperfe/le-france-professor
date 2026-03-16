import { test, expect } from '@playwright/test'
import { TUTOR_RESPONSE, startConversation, addFakeAudio } from './helpers'

test('tts: speaker and slow-play buttons appear below each tutor message', async ({ page }) => {
  await startConversation(page)

  await expect(page.getByRole('button', { name: /écouter en français/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /écouter lentement/i })).toBeVisible()
})

test('tts: clicking the speaker button plays the tutor response then stop returns to speaker', async ({ page }) => {
  await addFakeAudio(page)

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
  await addFakeAudio(page)

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
  await addFakeAudio(page)

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

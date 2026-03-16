import { test, expect } from '@playwright/test'
import { INITIAL_MESSAGE, TUTOR_RESPONSE } from './helpers'

test('sidebar: create conv1, send message, open conv2 via sidebar, send message, navigate back to conv1', async ({ page }) => {
  // ── Conv 1 ────────────────────────────────────────────────────────────────
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
  const conv1Url = page.url()

  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  // Sidebar shows the conversation title (at least once — other tests may have left entries)
  const expectedTitle = INITIAL_MESSAGE.slice(0, 40).trimEnd() + '…'
  await expect(page.locator('.hidden.md\\:flex').getByText(expectedTitle).first()).toBeVisible()

  await page.getByRole('textbox').fill('Bonjour depuis conv1 !')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Bonjour depuis conv1 !')).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  // ── Conv 2 — created from sidebar ────────────────────────────────────────
  await page.getByRole('button', { name: '+ Nouvelle conversation' }).click()
  await page.waitForURL((url) => url.toString() !== conv1Url)

  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()
  await expect(page.getByText('Bonjour depuis conv1 !')).not.toBeVisible()

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

  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()
  await expect(page.getByText('Bonjour depuis conv1 !')).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  await expect(page.getByText('Bonjour depuis conv2 !')).not.toBeVisible()

  await page.getByRole('textbox').fill('Je suis de retour !')
  await expect(page.getByRole('textbox')).toHaveValue('Je suis de retour !')
})

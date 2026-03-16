import { test, expect } from '@playwright/test'
import { TUTOR_RESPONSE, VOCABULARY_EXPLANATION, startConversation } from './helpers'

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

test('vocabulary: word is highlighted in the source tutor message', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await expect(page.getByRole('mark')).toBeVisible()
  await expect(page.getByRole('mark')).toHaveText(/bonjour/i)
})

test('vocabulary: clicking a highlighted word opens the notebook with that word remarked', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await page.getByRole('mark').click()

  await expect(page.getByRole('heading', { name: /vocabulaire/i })).toBeVisible()

  const highlightedItem = page.locator('li.bg-vocab-50')
  await expect(highlightedItem).toBeVisible()
  await expect(highlightedItem).toContainText('bonjour')
})

test('vocabulary notebook: badge shows word count and drawer lists saved words', async ({ page }) => {
  await startConversation(page)

  await expect(page.getByRole('button', { name: /ouvrir le carnet/i })).toBeVisible()
  await expect(page.locator('button[aria-label*="carnet"] span.rounded-full')).not.toBeVisible()

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await expect(page.locator('button[aria-label*="carnet"] span.rounded-full')).toHaveText('1')

  await page.getByRole('button', { name: /ouvrir le carnet/i }).click()
  await expect(page.getByRole('heading', { name: /vocabulaire/i })).toBeVisible()
  await expect(page.locator('li').getByText('bonjour')).toBeVisible()
  await expect(page.locator('li').getByText(VOCABULARY_EXPLANATION)).toBeVisible()
})

test('vocabulary notebook: drawer closes when clicking the backdrop', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await page.getByRole('button', { name: /ouvrir le carnet/i }).click()
  await expect(page.getByRole('heading', { name: /vocabulaire/i })).toBeVisible()

  await page.locator('.bg-black\\/20').click()
  await expect(page.getByRole('heading', { name: /vocabulaire/i })).not.toBeVisible()
})

test('vocabulary notebook: drawer closes with the × button', async ({ page }) => {
  await startConversation(page)

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await page.getByRole('button', { name: /ouvrir le carnet/i }).click()
  await expect(page.getByRole('heading', { name: /vocabulaire/i })).toBeVisible()

  await page.getByRole('button', { name: 'Fermer le carnet' }).click()
  await expect(page.getByRole('heading', { name: /vocabulaire/i })).not.toBeVisible()
})

test('vocabulary notebook: persists words across navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
  const conv1Url = page.url()

  await page.getByRole('textbox').fill('/vocabulary bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 bonjour')).toBeVisible()

  await page.getByRole('button', { name: '+ Nouvelle conversation' }).click()
  await page.waitForURL((url) => url.toString() !== conv1Url)

  await page.goto(conv1Url)
  await page.waitForURL(conv1Url)

  await expect(page.locator('button[aria-label*="carnet"] span.rounded-full')).toHaveText('1')

  await page.getByRole('button', { name: /ouvrir le carnet/i }).click()
  await expect(page.locator('li').getByText('bonjour')).toBeVisible()
})

test('vocabulary: highlight persists after navigating away and returning', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
  const conv1Url = page.url()

  await page.getByRole('textbox').fill('Bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  await page.getByRole('textbox').fill('/vocabulary français')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('📖 français')).toBeVisible()

  await expect(page.getByRole('mark')).toBeVisible()

  await page.getByRole('button', { name: '+ Nouvelle conversation' }).click()
  await page.waitForURL((url) => url.toString() !== conv1Url)

  await page.goto(conv1Url)
  await page.waitForURL(conv1Url)
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()

  await expect(page.getByRole('mark')).toBeVisible()
  await expect(page.getByRole('mark')).toHaveText(/français/i)
})

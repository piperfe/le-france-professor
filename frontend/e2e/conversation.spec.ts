import { test, expect } from '@playwright/test'
import { INITIAL_MESSAGE, TUTOR_RESPONSE, startConversation } from './helpers'

test('full conversation flow: start → receive greeting → send message → receive reply', async ({ page }) => {
  await startConversation(page)

  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  await page.getByRole('textbox').fill('Bonjour')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('Bonjour', { exact: true })).toBeVisible()
  await expect(page.getByText(TUTOR_RESPONSE)).toBeVisible()
})

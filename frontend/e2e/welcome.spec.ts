import { test, expect } from '@playwright/test'
import { INITIAL_MESSAGE } from './helpers'

test('welcome page: recent conversations list appears after creating a conversation and navigates back to it', async ({ page }) => {
  // Create a conversation so there is at least one in the backend
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.waitForURL(/\/conversation\//)
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()

  // Return to the welcome page — server-side render fetches the conversation list
  await page.goto('/')

  // The section label is visible
  await expect(page.getByText('conversations récentes')).toBeVisible()

  // The conversation we just created appears as a clickable item
  // Title is the initial message truncated to 40 chars + "…"
  const item = page.getByRole('button', { name: /Bonjour ! Comment puis/ }).first()
  await expect(item).toBeVisible()

  // Clicking navigates to a conversation page
  await item.click()
  await page.waitForURL(/\/conversation\//)
  await expect(page.getByText(INITIAL_MESSAGE)).toBeVisible()
})

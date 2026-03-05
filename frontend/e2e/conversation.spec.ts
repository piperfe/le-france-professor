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

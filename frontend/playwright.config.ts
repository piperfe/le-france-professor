import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node e2e/stub-backend.mjs',
      url: 'http://localhost:5101/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'BACKEND_URL=http://localhost:5101/api npm run build && BACKEND_URL=http://localhost:5101/api PORT=5100 npm run start',
      url: 'http://localhost:5100',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})

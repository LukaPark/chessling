import { defineConfig, devices } from '@playwright/test'

const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: { baseURL: external ?? 'http://localhost:4199', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4199 --strictPort',
        url: 'http://localhost:4199',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})

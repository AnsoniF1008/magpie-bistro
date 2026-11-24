import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against a throwaway SQLite database (data/e2e.db) in
 * demo-payment mode, so they never touch real data, Stripe or email.
 */
const env = {
  DATABASE_URL: 'file:./data/e2e.db',
  PAYLOAD_SECRET: 'e2e-secret',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
  NEXT_DIST_DIR: '.next-e2e',
  SEED_OWNER_EMAIL: 'owner@e2e.test',
  SEED_OWNER_PASSWORD: 'e2e-password-123',
  STRIPE_SECRET_KEY: '',
  RESEND_API_KEY: '',
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', ...devices['Desktop Chrome'], channel: 'chromium' },
  webServer: {
    command: 'node tests/e2e/reset-db.mjs && npm run seed && npx next dev -p 3100',
    url: 'http://localhost:3100/api/status',
    timeout: 240_000,
    reuseExistingServer: false,
    env,
  },
})

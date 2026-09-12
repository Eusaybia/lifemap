import { defineConfig } from '@playwright/test'

// Behaviour tests for the editor's own harness pages (app/cypress-*), served
// by lifemap's Next app on :3000. Playwright starts it when nothing answers
// and reuses it otherwise. LIFEMAP_TEST_BASE_URL points at another host.
const baseURL = process.env.LIFEMAP_TEST_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: process.env.CI ? undefined : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['blob']] : [['line'], ['html', { open: 'never' }]],
  // Specs run in the Google Chrome installed on this machine (channel below),
  // headless by default. `yarn test:e2e:headed` opens a visible window;
  // PWSLOWMO=250 slows each action so a person can follow along.
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: { slowMo: Number(process.env.PWSLOWMO ?? 0) },
  },
  webServer: process.env.LIFEMAP_TEST_BASE_URL
    ? undefined
    : { command: 'yarn next dev -p 3000', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } }],
})

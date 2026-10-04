import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.PFOTENNETZ_WEB_URL ?? 'http://127.0.0.1:3000',
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node .next/standalone/apps/web/server.js',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

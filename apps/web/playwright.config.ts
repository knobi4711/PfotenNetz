import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 3 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.PFOTENNETZ_WEB_URL ?? 'http://127.0.0.1:3000',
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CI
      ? 'node .next/standalone/apps/web/server.js'
      : 'pnpm start --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { HOSTNAME: '127.0.0.1', PORT: '3000' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

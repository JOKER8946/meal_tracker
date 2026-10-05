import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000', channel: 'chrome', actionTimeout: 20000, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } }],
  reporter: 'list',
});

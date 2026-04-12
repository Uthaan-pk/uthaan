import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'https://uthaan-one.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  timeout: 45000,
  outputDir: 'test-results/',
  globalSetup: './tests/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://uthaan-one.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  timeout: 30000,
  outputDir: 'test-results/',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

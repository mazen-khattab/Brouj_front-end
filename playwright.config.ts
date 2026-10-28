import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The configured certificate must be trusted; do not ignore HTTPS errors.
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    ignoreHTTPSErrors: false,
  },
});

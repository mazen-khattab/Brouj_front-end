import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/release-browser', fullyParallel: true,
  timeout: 180_000, retries: 0,
  outputDir: 'test-results/release',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/release', open: 'never' }]],
  // Dedicated real-backend checks must use another, explicitly configured run.
  // These tests exercise the compiled artifact with synthetic API responses.
  use: { baseURL: 'https://localhost:4173', ignoreHTTPSErrors: false, trace: 'retain-on-failure' },
  projects: [
    { name: 'release-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'release-mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: { command: 'npm run release:serve', url: 'https://localhost:4173', reuseExistingServer: false, ignoreHTTPSErrors: false, timeout: 30_000 },
});

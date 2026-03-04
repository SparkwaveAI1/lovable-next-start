import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'https://sparkwaveai.app',
    headless: true,
    // Reasonable timeouts for a remote server
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  // Single worker — avoids resource contention on VPS
  workers: 1,
  // Retry once on flaky network
  retries: 1,
  // Timeout per test
  timeout: 60000,
  reporter: [
    ['json', { outputFile: '/root/clawd/memory/daily-logs/e2e-results.json' }],
    ['list']
  ],
  outputDir: 'test-results',
});

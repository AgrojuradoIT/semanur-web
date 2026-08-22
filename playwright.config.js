import { defineConfig } from '@playwright/test';
import { TEST_API_BASE_URL, TEST_HOST, TEST_ORIGIN, TEST_PORT } from './test-config.js';

const requestedChannel = process.env.PLAYWRIGHT_CHANNEL;
const localWindowsChannel = process.platform === 'win32' && !process.env.CI ? 'chrome' : undefined;
const channel = requestedChannel || localWindowsChannel;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: TEST_ORIGIN,
    serviceWorkers: 'block',
    ...(channel ? { channel } : {}),
  },
  webServer: {
    command: `pnpm exec vite --mode test --host ${TEST_HOST} --port ${TEST_PORT} --strictPort`,
    url: TEST_ORIGIN,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_API_BASE_URL: TEST_API_BASE_URL,
      VITE_PUSHER_APP_KEY: 'playwright-disabled',
      VITE_PUSHER_APP_CLUSTER: 'mt1',
      VITE_REALTIME_ENABLED: 'false',
    },
  },
});

import { defineConfig } from '@playwright/test';

const requestedChannel = process.env.PLAYWRIGHT_CHANNEL;
const localWindowsChannel = process.platform === 'win32' && !process.env.CI ? 'chrome' : undefined;
const channel = requestedChannel || localWindowsChannel;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    ...(channel ? { channel } : {}),
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});

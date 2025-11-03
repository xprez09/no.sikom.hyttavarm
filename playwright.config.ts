/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable node/no-unpublished-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Serving the settings page: we use the built-in webServer to serve the project root
// and then navigate to /settings/index.html in tests.
export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173', // arbitrary dev port; tests will start a server below
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx serve -l 5173 .',
    port: 5173,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

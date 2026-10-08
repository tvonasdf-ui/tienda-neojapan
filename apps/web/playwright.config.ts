import { defineConfig, devices } from '@playwright/test';

const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'pnpm --filter @neojapan/api dev',
      url: 'http://localhost:3002/api/v1/products?limit=1',
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @neojapan/web dev',
      url: 'http://localhost:3000/catalogo',
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});

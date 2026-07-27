import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? 'http://127.0.0.1:5173';
const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: [
          {
            command:
              'bun run --cwd apps/api db:migrate && bun run --cwd apps/api db:seed && bun run --cwd apps/api dev',
            url: 'http://127.0.0.1:3000/ready',
            timeout: 120_000,
            reuseExistingServer,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
            env: {
              NODE_ENV: 'development',
              HOST: '127.0.0.1',
              PORT: '3000',
              WEB_ORIGIN: baseURL,
              PUBLIC_BASE_URL: baseURL,
              PGLITE_DATA_DIR:
                process.env.E2E_PGLITE_DATA_DIR ??
                `.data/wargahub-e2e-${process.pid}`,
            },
          },
          {
            command: 'bun run --cwd apps/web dev',
            url: baseURL,
            timeout: 120_000,
            reuseExistingServer,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
          },
        ],
      }),
});

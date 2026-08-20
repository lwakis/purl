import { defineConfig, devices } from '@playwright/test';

// E2E smoke tests for the core user flow.
//
// Starts both servers automatically:
//   - backend: FastAPI on :8000 in MOCK mode (LLM_API_KEY forced empty, so
//     no external LLM calls — deterministic, works without credentials)
//   - frontend: Vite dev server on :5173 (proxies /api → :8000)
//
// Run locally with `npm run test:e2e`. In CI, Playwright installs its own
// Chromium via `npx playwright install --with-deps chromium`.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Mock mode: empty LLM_API_KEY disables real LLM calls (backend config
      // reads this env var over any value in backend/.env).
      command: 'uv run uvicorn app.main:app --port 8000',
      cwd: '../backend',
      url: 'http://localhost:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { LLM_API_KEY: '' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});

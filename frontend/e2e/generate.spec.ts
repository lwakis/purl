import { test, expect, type APIRequestContext } from '@playwright/test';

// E2E smoke test of the core generate flow against the real backend in
// mock mode (see playwright.config.ts — LLM_API_KEY is forced empty, so the
// backend streams a local mock design with no external calls).
//
// The default UI locale is 'ru', which falls back to backend-provided
// template text, so selectors are built from the live /api/templates
// response instead of hardcoding strings (single source of truth).

function escaped(substring: string): RegExp {
  return new RegExp(substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

// The seeded landing template — the same data the app renders. Fetching it
// also proves backend connectivity (mock mode).
async function fetchLandingTemplate(request: APIRequestContext) {
  const templates = await (await request.get('/api/templates')).json();
  const landing = templates.find((t: { category: string }) => t.category === 'landing');
  expect(landing).toBeDefined();
  return landing;
}

test('generate flow: prompt → streamed preview', async ({ page, request }) => {
  const landing = await fetchLandingTemplate(request);

  await page.goto('/');

  // The title appears twice (chip in PromptInput + card in TemplateGallery),
  // so scope to the gallery card by description and use .first().
  const templateCard = page
    .getByRole('button', { name: escaped(landing.title) })
    .filter({ hasText: escaped(landing.description.slice(0, 20).trim()) })
    .first();
  await expect(templateCard).toBeVisible({ timeout: 15_000 });

  // Type a prompt into the main textarea and generate.
  const promptBox = page.getByTestId('prompt-input');
  await promptBox.fill(landing.prompt_text);
  await page.getByTestId('generate-button').click();

  // Generation completes → the design canvas (PreviewPanel) replaces the
  // landing empty state; the preview iframe must get non-empty content.
  const previewFrame = page.frameLocator('[data-testid="preview-iframe"]');
  await expect(previewFrame.locator('body')).not.toBeEmpty({ timeout: 30_000 });
});

test('template select fills the prompt box', async ({ page, request }) => {
  const landing = await fetchLandingTemplate(request);

  await page.goto('/');

  const templateCard = page
    .getByRole('button', { name: escaped(landing.title) })
    .filter({ hasText: escaped(landing.description.slice(0, 20).trim()) })
    .first();
  await expect(templateCard).toBeVisible({ timeout: 15_000 });

  // Clicking a template card must prefill the main prompt textarea with the
  // template's prompt text from the backend.
  await templateCard.click();
  await expect(page.getByTestId('prompt-input')).toHaveValue(
    escaped(landing.prompt_text.slice(0, 30)),
  );
});

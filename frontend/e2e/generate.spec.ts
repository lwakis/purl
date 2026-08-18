import { test, expect } from '@playwright/test';

// E2E smoke test of the core generate flow against the real backend in
// mock mode (see playwright.config.ts — LLM_API_KEY is forced empty, so the
// backend streams a local mock design for any prompt with no external calls).
//
// The redesigned landing has no template gallery or chips: generation starts
// from a plain prompt typed straight into the hero textarea. The default UI
// locale is 'ru', so the headline above the input is asserted in Russian.

test('generate flow: prompt → streamed preview', async ({ page }) => {
  await page.goto('/');

  // Type a prompt into the hero textarea and generate.
  await page.getByTestId('prompt-input').fill('Создай лендинг для HR-SaaS с тёмной темой');
  await page.getByTestId('generate-button').click();

  // Generation completes → the design canvas replaces the landing; the
  // preview iframe must get non-empty content.
  const previewFrame = page.frameLocator('[data-testid="preview-iframe"]');
  await expect(previewFrame.locator('body')).not.toBeEmpty({ timeout: 30_000 });
});

test('landing shows the headline and hero prompt input', async ({ page }) => {
  await page.goto('/');

  // The landing headline above the prompt input (default UI locale is 'ru').
  await expect(page.getByRole('heading', { name: 'Что вы хотите создать?' })).toBeVisible();

  // The hero prompt textarea is ready for direct input.
  await expect(page.getByTestId('prompt-input')).toBeVisible();
});

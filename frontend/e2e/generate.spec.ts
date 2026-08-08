import { test, expect } from '@playwright/test';

// E2E smoke test of the core generate flow against the real backend in
// mock mode (see playwright.config.ts — LLM_API_KEY is forced empty, so the
// backend streams a local mock design with no external calls).
//
// Default UI locale is 'ru', so selectors below use the Russian strings.

test('generate flow: prompt → streamed preview', async ({ page }) => {
  await page.goto('/');

  // Templates are fetched from the backend /api/templates and seeded on
  // first access — a gallery card proves backend connectivity. The title
  // appears twice (chip in PromptInput + card in TemplateGallery), so scope
  // to the gallery card and use .first().
  const templateCard = page
    .getByRole('button', { name: /Лендинг SaaS-продукта/ })
    .filter({ hasText: 'Одностраничный лендинг' })
    .first();
  await expect(templateCard).toBeVisible({ timeout: 15_000 });

  // Type a prompt into the main textarea and generate.
  const promptBox = page.getByRole('textbox', { name: 'Описание дизайна' });
  await promptBox.fill('Создай лендинг для кофейни с меню и контактами');
  await page.getByRole('button', { name: 'Сгенерировать' }).click();

  // Generation completes → the design canvas (PreviewPanel) replaces the
  // landing empty state; the preview iframe must get non-empty content.
  const previewIframe = page.getByTitle('Предпросмотр дизайна');
  await expect(previewIframe).toBeVisible({ timeout: 30_000 });

  const frame = previewIframe.contentFrame();
  await expect(frame?.locator('body')).not.toBeEmpty();
});

test('template select fills the prompt box', async ({ page }) => {
  await page.goto('/');

  const templateCard = page
    .getByRole('button', { name: /Лендинг SaaS-продукта/ })
    .filter({ hasText: 'Одностраничный лендинг' })
    .first();
  await expect(templateCard).toBeVisible({ timeout: 15_000 });

  // Clicking a template card must prefill the main prompt textarea.
  await templateCard.click();
  await expect(page.getByRole('textbox', { name: 'Описание дизайна' })).toHaveValue(
    /Создай современный лендинг для SaaS-продукта/,
  );
});

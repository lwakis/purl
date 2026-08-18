import { test, expect } from '@playwright/test';

// Regression for the "white screen on link click" bug: a sandboxed iframe
// without allow-same-origin navigates itself when a plain link is clicked,
// and most sites refuse to render inside a frame (X-Frame-Options) — the
// preview goes blank. The navigation guard injected into srcDoc intercepts
// clicks: absolute http(s) links open in a real tab, relative links are
// blocked, both surface a toast, and the iframe keeps showing the design.
test('preview links: absolute opens a new tab, relative is blocked, no white screen', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('prompt-input').fill('Создай лендинг');
  await page.getByTestId('generate-button').click();

  const previewFrame = page.frameLocator('[data-testid="preview-iframe"]');
  await expect(previewFrame.locator('body')).not.toBeEmpty({ timeout: 30_000 });

  // Wait for the stream to settle: the progress panel (and its cancel button)
  // unmounts when generation completes. Until then the overlay intercepts
  // clicks and the committed frame can still swap underneath.
  await expect(page.getByRole('button', { name: 'Отменить генерацию' })).toHaveCount(0, {
    timeout: 30_000,
  });

  // Inject test links into the generated document (sandboxed frames are still
  // scriptable from the test runner).
  await previewFrame.locator('body').evaluate((body) => {
    const ext = document.createElement('a');
    ext.id = 'nav-ext';
    ext.href = 'https://example.com/';
    ext.textContent = 'external';
    const rel = document.createElement('a');
    rel.id = 'nav-rel';
    rel.href = '/missing.html';
    rel.textContent = 'internal';
    body.appendChild(ext);
    body.appendChild(rel);
  });

  // Absolute link → the iframe must not navigate away (no white screen) and a
  // toast reports the new tab.
  await previewFrame.locator('#nav-ext').click();
  await expect(page.getByText('Ссылка открыта в новой вкладке')).toBeVisible();
  await expect(previewFrame.locator('body')).not.toBeEmpty();

  // Relative link → blocked with a toast, iframe still on the design.
  await previewFrame.locator('#nav-rel').click();
  await expect(page.getByText('Внутренние ссылки в предпросмотре недоступны')).toBeVisible();
  await expect(previewFrame.locator('body')).not.toBeEmpty();
});

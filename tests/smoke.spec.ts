import { expect, test } from '@playwright/test';

/**
 * M0 exit criteria as executable checks (ROADMAP): the skeleton boots, the shell
 * renders, the save round-trips through IndexedDB, and the game never touches the
 * network — which is what makes it deployable to Vercel *and* wrappable in
 * Electron later (ARCHITECTURE §6).
 */

test('boots to the title gate', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('OneMoreFloor').first()).toBeVisible();
  await expect(page.getByText('Climb the Lootspire. One more floor.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter the Spire/i })).toBeVisible();
});

test('enters the hub shell and reports a fresh save', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();

  const hub = page.locator('[data-testid="hub"]');
  await expect(hub).toBeVisible();

  // The rail's destinations exist but are not pretending to work yet (Brief §2.1).
  const rail = hub.locator('.omf-shell__rail');
  await expect(rail.getByText('Tower', { exact: true })).toBeVisible();
  await expect(rail.getByText('Character', { exact: true })).toBeVisible();
  await expect(rail.getByRole('button', { name: 'Tower' })).toBeDisabled();

  await expect(page.locator('[data-testid="save-status"]')).toHaveText('New save created.');
});

test('persists the save across a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="save-status"]')).toHaveText('New save created.');

  await page.reload();
  await page.getByRole('button', { name: /Enter the Spire/i }).click();

  // Second boot finds the record written by the first one: the save layer really
  // round-trips through IndexedDB rather than starting fresh every time.
  await expect(page.locator('[data-testid="save-status"]')).toHaveText('Save loaded.');
});

test('tears the previous screen down on navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();

  // The router's contract: one screen mounted at a time, the old one destroyed.
  await expect(page.getByRole('button', { name: /Enter the Spire/i })).toHaveCount(0);
  await expect(page.locator('#app > *')).toHaveCount(1);
});

test('runs entirely from its own origin — no CDN, no external requests', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('data:')) {
      external.push(url);
    }
  });

  const failed: string[] = [];
  page.on('requestfailed', (request) => failed.push(request.url()));

  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();

  expect(external, 'the game must never reach the network at runtime').toEqual([]);
  expect(failed, 'every asset must resolve locally').toEqual([]);
});

test('serves the vendored FantasyUI artwork from the build', async ({ page }) => {
  const art: Array<{ url: string; status: number }> = [];
  page.on('response', (response) => {
    if (response.url().includes('/fui/')) {
      art.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();

  expect(art.length, 'vendored art should be requested by the themed components').toBeGreaterThan(
    0,
  );
  expect(art.filter((entry) => entry.status !== 200)).toEqual([]);
});

test('reports no console errors during a normal boot', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();

  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

/**
 * Exit criteria as executable checks (ROADMAP M0/M1): the game boots, a hero can
 * be created, played, switched and reset, the save survives a reload, and the
 * whole thing never touches the network — which is what makes it deployable to
 * Vercel *and* wrappable in Electron later (ARCHITECTURE §6).
 */

async function enterSelect(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
}

async function createHero(page: Page, name: string, className = 'Warrior'): Promise<void> {
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="hero-creation"]')).toBeVisible();

  await page.getByRole('option', { name: className }).click();
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: /Begin the climb/i }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();
}

test('boots to the title gate', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('OneMoreFloor').first()).toBeVisible();
  await expect(page.getByText('Climb the Lootspire. One more floor.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter the Spire/i })).toBeVisible();
});

test('offers five slots, one open and four locked (§15.2)', async ({ page }) => {
  await enterSelect(page);

  const select = page.locator('[data-testid="character-select"]');
  await expect(select.getByRole('button', { name: 'Empty slot' })).toBeVisible();
  await expect(select.getByRole('button', { name: 'Locked slot' })).toHaveCount(4);
});

test('creates a hero and enters the hub with them', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Mage');

  const hub = page.locator('[data-testid="hub"]');
  await expect(hub.getByText('Grimhild').first()).toBeVisible();
  await expect(hub.getByText('Patience, then ruin.')).toBeVisible();
});

test('refuses a name that breaks the rules, without leaving the screen (Q25)', async ({ page }) => {
  await enterSelect(page);
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="hero-creation"]')).toBeVisible();

  await page.getByLabel('Character name').fill('x');
  await page.getByRole('button', { name: /Begin the climb/i }).click();

  await expect(page.locator('[data-testid="name-error"]')).toHaveText(/at least 3 characters/i);
  await expect(page.locator('[data-testid="hero-creation"]')).toBeVisible();
});

test('keeps the hero across a reload and re-enters them from the slot', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild');

  await page.reload();
  await page.getByRole('button', { name: /Enter the Spire/i }).click();

  const select = page.locator('[data-testid="character-select"]');
  await expect(select.getByRole('button', { name: /Grimhild/ })).toBeVisible();
  await expect(select.getByText('Level 1 Warrior').first()).toBeVisible();

  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="hub"]')).toBeVisible();
  await expect(page.locator('[data-testid="save-status"]')).toHaveText('Save loaded.');
});

test('switches back to the select screen from the hub (Q2)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild');

  await page.getByRole('button', { name: /Switch hero/i }).click();

  await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
  await expect(page.locator('[data-testid="hub"]')).toHaveCount(0);
});

test('resets a slot only after the hero name is typed out (Brief §19)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild');
  await page.getByRole('button', { name: /Switch hero/i }).click();

  await page.getByRole('button', { name: /Reset this slot/i }).click();

  const erase = page.getByRole('button', { name: /Erase this hero/i });
  await expect(erase).toBeDisabled();

  await page.getByRole('textbox').last().fill('Grimhild');
  await expect(erase).toBeEnabled();
  await erase.click();

  const select = page.locator('[data-testid="character-select"]');
  await expect(select.getByRole('button', { name: 'Empty slot' })).toBeVisible();
  await expect(select.getByText('Grimhild')).toHaveCount(0);
});

test('tears the previous screen down on navigation', async ({ page }) => {
  await enterSelect(page);

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
  const notFound: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) notFound.push(`${response.status()} ${response.url()}`);
  });

  await enterSelect(page);
  await createHero(page, 'Grimhild');

  expect(external, 'the game must never reach the network at runtime').toEqual([]);
  expect(failed, 'every asset must resolve locally').toEqual([]);
  expect(notFound, 'every asset must exist in the build').toEqual([]);
});

test('serves the vendored FantasyUI artwork and our own portraits from the build', async ({
  page,
}) => {
  const art: Array<{ url: string; status: number }> = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/fui/') || url.includes('/art/')) {
      art.push({ url, status: response.status() });
    }
  });

  await enterSelect(page);
  await createHero(page, 'Grimhild');

  expect(art.length).toBeGreaterThan(0);
  expect(art.filter((entry) => entry.status !== 200)).toEqual([]);
  expect(art.some((entry) => entry.url.includes('/art/classes/'))).toBe(true);
});

test('reports no console errors through the whole lifecycle', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await enterSelect(page);
  await createHero(page, 'Grimhild');
  await page.getByRole('button', { name: /Switch hero/i }).click();
  await expect(page.locator('[data-testid="character-select"]')).toBeVisible();

  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

/**
 * Exit criteria as executable checks (ROADMAP M0/M1/M4): the game boots, a hero
 * can be created, played, switched and reset, the save survives a reload, the
 * tower can be climbed until it kills you and re-climbed after, no native
 * browser tooltip ever reaches the screen (Brief §20.4), and the whole thing
 * never touches the network — which is what makes it deployable to Vercel *and*
 * wrappable in Electron later (ARCHITECTURE §6).
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

test('creates a hero and enters the tower with them', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Mage');

  const hub = page.locator('[data-testid="hub"]');
  await expect(hub.locator('[data-testid="hero-name"]')).toHaveText('Grimhild');
  await expect(hub.getByText('Mage').first()).toBeVisible();

  // The tower is the hero's home screen: where they are, and what is next.
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
  await expect(page.locator('[data-testid="floor-preview"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fight Floor 1/i })).toBeVisible();
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

/** Start the floor the hero is standing on, from the tower. */
async function startFight(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Fight Floor|Face the Boss/i }).click();
  await expect(page.locator('[data-testid="combat-screen"]')).toBeVisible();
}

/** Jump a running fight straight to its verdict (Brief §3.4). */
async function skipToVerdict(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Skip$/ }).click();
}

async function fightAndSkip(page: Page): Promise<void> {
  await startFight(page);
  await skipToVerdict(page);
}

test('clears a floor, banks what it gave and offers one more (Brief §3.6)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  await expect(page.locator('[data-testid="combat-card-hero"]')).toHaveCount(0);
  await fightAndSkip(page);

  await expect(page.getByText('Floor 1 Cleared')).toBeVisible();
  await expect(page.getByRole('button', { name: /One More Floor/i })).toBeVisible();

  await page.getByRole('button', { name: /Back to the Spire/i }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fight Floor 2/i })).toBeVisible();
});

test('climbs floor after floor without returning to the tower (§1)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  await fightAndSkip(page);
  await page.getByRole('button', { name: /One More Floor/i }).click();

  await expect(page.locator('[data-testid="combat-screen"]')).toBeVisible();
  await page.getByRole('button', { name: /^Skip$/ }).click();
  await expect(page.getByText(/Floor 2 Cleared|The Spire Takes You/)).toBeVisible();
});

test('a death keeps everything and offers the way back up (Brief §3.3/§3.4)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  // The Swashbuckler is the shallowest death in the balance sim, which is what
  // makes her the right hero for a test that has to actually die.
  await createHero(page, 'Grimhild', 'Swashbuckler');

  const death = page.getByText('The Spire Takes You');
  const oneMore = page.getByRole('button', { name: /One More Floor/i });

  await startFight(page);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await skipToVerdict(page);
    // The aftermath holds exactly one thing at a time: the level-up celebration
    // first when there is one, then the verdict.
    const aftermath = page.locator('.omf-combat__aftermath > *');
    await expect(aftermath).toBeVisible();

    const levelUp = page.getByRole('button', { name: /^Continue$/ });
    if (await levelUp.isVisible().catch(() => false)) {
      await levelUp.click();
      await expect(aftermath).toBeVisible();
    }

    if (await death.isVisible().catch(() => false)) break;
    // "One More Floor" walks straight into the next fight — no tower in between.
    await oneMore.click();
    await expect(page.locator('[data-testid="combat-screen"]')).toBeVisible();
  }

  await expect(death).toBeVisible();
  await expect(page.getByText('Nothing you own was lost')).toBeVisible();

  // Death resets the climb and nothing else, so the way back up is a Quick-Raid.
  await page.getByRole('button', { name: /Quick-Raid back to Floor/i }).click();
  await expect(page.locator('[data-testid="raid"]')).toBeVisible();

  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
});

test('never shows a native browser tooltip anywhere (Brief §20.4)', async ({ page }) => {
  await enterSelect(page);
  const titles = async (): Promise<string[]> =>
    page.$$eval('[title]', (nodes) =>
      nodes.map((node) => `${node.tagName}.${node.className}[title]`),
    );

  expect(await titles(), 'character select').toEqual([]);
  await createHero(page, 'Grimhild', 'Hunter');
  expect(await titles(), 'the tower').toEqual([]);

  await fightAndSkip(page);
  expect(await titles(), 'a fight and its result').toEqual([]);
});

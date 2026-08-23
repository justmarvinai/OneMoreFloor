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

  // The first-run tour opens over the tower (§18). Tests that are not about the
  // tutorial skip past it; the ones that are, below, drive it deliberately.
  await dismissTutorial(page);
}

/** Skip the tour if it is showing, and wait until it is gone. */
async function dismissTutorial(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: /Skip the tour/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(skip).toHaveCount(0);
  }
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
  // Anchored: once a Quick-Raid is available the control is a `SplitButton`, and
  // its caret is labelled "More fight floor 1 options" — which an unanchored
  // /Fight Floor/ matches just as well as the button that starts the fight.
  await page.getByRole('button', { name: /^(Fight Floor|Face the Boss)/i }).click();
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

/**
 * Clear floors until the hero has gold to spend, and always finish standing in
 * the tower — a death mid-climb is an ordinary outcome, not a broken test.
 */
async function climb(page: Page, floors: number): Promise<void> {
  for (let index = 0; index < floors; index += 1) {
    await startFight(page);
    await skipToVerdict(page);
    await expect(page.locator('.omf-combat__aftermath > *')).toBeVisible();

    const levelUp = page.getByRole('button', { name: /^Continue$/ });
    if (await levelUp.isVisible().catch(() => false)) await levelUp.click();

    const back = page.getByRole('button', { name: /Back to the Spire/i });
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await expect(page.locator('[data-testid="tower"]')).toBeVisible();
      continue;
    }

    // The spire won. Take the way back up it offers and stop climbing. That
    // route goes through the raid summary when there are floors to raid, and
    // straight to the tower when there are not.
    await page
      .getByRole('button', { name: /Quick-Raid back to Floor|Return to the Spire/i })
      .click();

    const raid = page.locator('[data-testid="raid"]');
    const tower = page.locator('[data-testid="tower"]');
    await expect(raid.or(tower).first()).toBeVisible();
    if (await raid.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^Continue$/ }).click();
    }
    await expect(tower).toBeVisible();
    return;
  }
}

async function goToSection(page: Page, label: string): Promise<void> {
  await page.locator('.fui-sidenav__item', { hasText: label }).click();
}

test('shows what every stat does, not just what it is (Brief §6)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Character');

  const screen = page.locator('[data-testid="character"]');
  await expect(screen).toBeVisible();
  await expect(screen.getByText(/damage a strike/)).toBeVisible();
  await expect(screen.getByText(/of damage turned away/)).toBeVisible();
  await expect(screen.getByText(/critical hits/)).toBeVisible();

  // Speed is on the list and explicitly unbuyable — the §6 exception, visible.
  await expect(screen.getByText('Speed comes only from gear')).toBeVisible();
});

test('spends gold on a stat and the number moves (Brief §6)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await climb(page, 6);
  await goToSection(page, 'Character');

  const row = page.locator('[data-stat="hp"]');
  const before = Number(await row.locator('.omf-character__stat-value').innerText());
  await row.getByRole('button', { name: /Buy/i }).click();

  await expect
    .poll(async () => Number(await row.locator('.omf-character__stat-value').innerText()))
    .toBeGreaterThan(before);
});

test('sells what the merchant stocks, at the hero’s own power (Brief §11, §13)', async ({
  page,
}) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await climb(page, 6);
  await goToSection(page, 'Equipment');

  const shop = page.locator('[data-testid="merchant"]');
  await expect(shop).toBeVisible();
  await expect(shop.getByText('Equipment Merchant')).toBeVisible();
  // The free wait is on screen beside the paid restock — never only the paid one.
  await expect(shop.getByText(/New goods in/)).toBeVisible();
  await expect(shop.getByRole('button', { name: /Restock now/i })).toBeVisible();

  // The Alchemist is its own destination on the rail, and pours draughts by the
  // hour (§12) — not a tab hidden inside the armourer's window.
  await goToSection(page, 'Alchemist');
  await expect(page.locator('[data-testid="merchant"]').getByText('Magic Merchant')).toBeVisible();
  await expect(page.getByText(/for one hour/).first()).toBeVisible();

  // Each counter keeps its own free countdown and paid reroll.
  await expect(page.getByText(/New goods in/)).toBeVisible();
});

test('closes the loop: buy a piece, wear it, hit harder (ROADMAP M5)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // Floor payouts and shelf prices are both rolled, so the test earns until the
  // shop is affordable rather than assuming a fixed number of floors covers it.
  const buyButtons = page
    .locator('[data-testid="merchant"] .fui-itemcard')
    .getByRole('button', { name: 'Buy', exact: true })
    .and(page.locator('button:not([disabled])'));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await climb(page, 5);
    await goToSection(page, 'Equipment');
    if ((await buyButtons.count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  expect(await buyButtons.count(), 'nothing on the shelf was ever affordable').toBeGreaterThan(0);

  await goToSection(page, 'Character');
  const power = page.locator('[data-testid="character"] .fui-power__value');
  const before = Number((await power.innerText()).replace(/[^\d]/g, ''));

  await goToSection(page, 'Equipment');
  await buyButtons.first().click();

  // The piece is in the backpack; wearing it is the point of buying it.
  await goToSection(page, 'Character');
  // The purchase lands at the end of the pack, behind whatever the climb dropped.
  await page
    .locator('[data-testid="character"] .fui-inv .fui-slot:not(.fui-slot--empty)')
    .last()
    .click();
  await expect(page.locator('[data-testid="gear-dialog"]')).toBeVisible();
  await page.getByRole('button', { name: /^Equip$/ }).click();

  await expect
    .poll(async () => Number((await power.innerText()).replace(/[^\d]/g, '')))
    .toBeGreaterThan(before);
});

test('opens the tour on a first hero, and lets it be skipped (Brief §18)', async ({ page }) => {
  await enterSelect(page);
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.getByRole('option', { name: 'Warrior' }).click();
  await page.getByLabel('Character name').fill('Grimhild');
  await page.getByRole('button', { name: /Begin the climb/i }).click();

  await expect(page.getByText('The Lootspire').first()).toBeVisible();
  // The nudge is where the decision is made, not buried in a dialog (§18).
  await expect(page.getByText(/it ends with a Lucky Ticket/)).toBeVisible();

  await page.getByRole('button', { name: /Skip the tour/i }).click();
  await expect(page.getByRole('button', { name: /Skip the tour/i })).toHaveCount(0);
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();

  // Skipping forfeits the reward — it is a *completion* reward (§18).
  await goToSection(page, 'Account');
  await expect(page.locator('[data-testid="upgrades"]')).toBeVisible();
});

test('pays the tour out on completion, and never opens again (Brief §18)', async ({ page }) => {
  await enterSelect(page);
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.getByRole('option', { name: 'Warrior' }).click();
  await page.getByLabel('Character name').fill('Grimhild');
  await page.getByRole('button', { name: /Begin the climb/i }).click();

  // Walk the whole tour. Every step advances with one button; the last one's
  // says "Begin the climb" instead of "Got it".
  const advance = page.locator('.fui-tutmask button').last();
  const reward = page.getByText('Take this with you');
  for (let step = 0; step < 10; step += 1) {
    if (await reward.isVisible().catch(() => false)) break;
    await expect(advance).toBeVisible();
    await advance.click();
  }

  await expect(reward).toBeVisible();
  await page.getByRole('button', { name: /^Take it$/ }).click();

  // A Lucky Ticket and starting gold, and the tour is done for good.
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
  await expect(page.getByText('Take this with you')).toHaveCount(0);

  // The starting gold arriving is the visible proof the reward was banked —
  // and waiting for it means the reload below cannot race the save.
  await expect(page.locator('.omf-shell__rail .fui-currency__value').first()).toHaveText(/500/);

  await page.reload();
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Skip the tour/i })).toHaveCount(0);
});

test('puts three dailies and three weeklies up, one of them hard (Q21)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await climb(page, 3);
  await goToSection(page, 'Quests');

  const board = page.locator('[data-testid="quests"]');
  await expect(board).toBeVisible();
  await expect(board.locator('[data-testid="quest-card"]')).toHaveCount(6);
  await expect(board.getByText('Hard')).toHaveCount(1);

  // Both columns say when they turn over — the question a board exists to answer.
  await expect(board.getByText('Resets in')).toHaveCount(2);

  /**
   * Climbing moved something, which is the whole wiring end to end.
   *
   * Which six quests the board draws is rolled, and not all of them count floors
   * — three floors can genuinely move none of them. So this climbs until one
   * shows progress rather than assuming a fixed number of floors always does,
   * which is what made it fail about one run in three.
   */
  const moved = board.getByText(/[1-9]\d* \/ /);
  for (let attempt = 0; attempt < 4 && (await moved.count()) === 0; attempt += 1) {
    await goToSection(page, 'Tower');
    await climb(page, 4);
    await goToSection(page, 'Quests');
  }
  await expect(moved.first()).toBeVisible();
});

test('sells the three account upgrades, and only those three (Brief §15, Q30)', async ({
  page,
}) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Account');

  const screen = page.locator('[data-testid="upgrades"]');
  await expect(screen.getByText('Battle Speed')).toBeVisible();
  await expect(screen.getByText('Account Slots')).toBeVisible();
  // Scoped to the upgrade rack, not the whole screen: §15's guarantee is that
  // there are exactly two things to *buy*, and the screen also carries the
  // credits panel, which sells nothing.
  await expect(screen.getByRole('heading', { name: 'Backpack' })).toBeVisible();
  // Three since Q30 added the backpack; still a closed set, not a registry.
  const cards = screen.locator('.omf-upgrades__cards .fui-panel');
  await expect(cards).toHaveCount(3);

  // Earn until the cheap upgrade is within reach, then buy it. A `CostButton`
  // that cannot be paid for stays pressable and says how short you are, so the
  // shortfall line — not a disabled attribute — is what "affordable" looks like.
  const slotsCard = cards.nth(1);
  const buy = slotsCard.getByRole('button', { name: /Unlock slot 2/i });
  const shortfall = slotsCard.getByText(/gold needed/i);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await shortfall.count()) === 0) break;
    await goToSection(page, 'Tower');
    await climb(page, 6);
    await goToSection(page, 'Account');
  }
  expect(await shortfall.count(), 'never earned enough for the cheapest upgrade').toBe(0);

  await buy.click();
  await expect(screen.getByText('2 of 5 character slots unlocked.')).toBeVisible();

  // And the account keeps it: character select now offers a second slot (§15.2).
  await page.getByRole('button', { name: /Switch hero/i }).click();
  const select = page.locator('[data-testid="character-select"]');
  await expect(select.getByRole('button', { name: 'Empty slot' })).toBeVisible();
  await expect(select.getByRole('button', { name: 'Locked slot' })).toHaveCount(3);
});

/* --- M7: the gacha (Brief §16) -------------------------------------------- */

test('prints the odds it runs, and refuses a rite it cannot pay for (§16.2)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Summoning');

  const lobby = page.locator('[data-testid="gacha"]');
  await expect(lobby).toBeVisible();
  await expect(lobby.getByText('Rite of Embers')).toBeVisible();
  await expect(lobby.getByText('Rite of the Fallen Star')).toBeVisible();

  // The disclosure is stated once, under both tables, rather than twice.
  await expect(lobby.locator('.omf-gacha__terms li')).toHaveCount(3);

  // The disclosure is the point of the screen: every row, adding to 100%.
  const rates = lobby.locator('.fui-rates');
  await expect(rates).toHaveCount(2);
  await expect(rates.first().locator('.fui-rates__row')).toHaveCount(5);
  await expect(rates.first().getByText('100.00%')).toBeVisible();

  // The jackpots are printed as the extremely low numbers §16.2 demands.
  await expect(rates.first().getByText('Legendary gear')).toBeVisible();
  await expect(rates.nth(1).getByText('0.80%')).toBeVisible();

  // No tickets yet, so both rites say so rather than failing on the press.
  await expect(lobby.getByText(/Summon Ticket needed/i).first()).toBeVisible();
});

test('performs the rite, banks the prize and spends the ticket (§16.3)', async ({ page }) => {
  test.slow();
  await enterSelect(page);

  // The tour pays a Lucky Ticket, which is the honest way into the rite.
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.getByRole('option', { name: 'Warrior' }).click();
  await page.getByLabel('Character name').fill('Grimhild');
  await page.getByRole('button', { name: /Begin the climb/i }).click();

  const advance = page.locator('.fui-tutmask button').last();
  const reward = page.getByText('Take this with you');
  for (let step = 0; step < 10; step += 1) {
    if (await reward.isVisible().catch(() => false)) break;
    await advance.click();
  }
  await page.getByRole('button', { name: /^Take it$/ }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();

  await goToSection(page, 'Summoning');
  const lobby = page.locator('[data-testid="gacha"]');
  const luckyCard = lobby.locator('.fui-panel').nth(1);
  await expect(luckyCard.locator('.fui-chip__value')).toHaveText('1');

  // Perform the Lucky rite — the second card's pull button.
  await lobby
    .locator('.fui-panel')
    .nth(1)
    .getByRole('button', { name: /Perform the rite/i })
    .click();

  // It is a set-piece, not a transition: the chamber covers the game and the
  // circle speaks before anything is revealed (§16.3).
  const rite = page.locator('[data-testid="rite"]');
  await expect(rite).toBeVisible();
  await expect(rite).toHaveAttribute('data-phase', 'build');
  await expect(page.locator('[data-testid="rite-caption"]')).not.toBeEmpty();

  // Skipping lands on the same answer the animation was going to give.
  await rite.getByRole('button', { name: /^Skip$/ }).click();
  await expect(rite).toHaveAttribute('data-phase', 'reveal');
  await expect(rite.locator('.omf-rite__prizeName')).toBeVisible();

  await rite.getByRole('button', { name: /^Take it$/ }).click();
  await expect(rite).toHaveCount(0);

  // The ticket is gone and the rite now refuses, which is the whole loop.
  await expect(luckyCard.locator('.fui-chip__value')).toHaveText('0');
  await expect(lobby.getByText(/Lucky Ticket needed/i).first()).toBeVisible();
});

test('shows no native tooltip in the lobby or the rite either (§20.4)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Summoning');

  await expect(page.locator('[data-testid="gacha"]')).toBeVisible();
  expect(
    await page.$$eval('[title]', (nodes) => nodes.map((node) => node.tagName)),
    'the summoning lobby',
  ).toEqual([]);
});

/* --- M10: the §2.1 / §20.5 sweep ------------------------------------------ */

/**
 * The vocabulary of refusals the game actually speaks. Every greyed-out control
 * must say why, either in a tooltip or in visible text on its own card (§20.5).
 * A new refusal that says nothing fails here rather than in a player's face.
 */
const REFUSAL = /short|Sold out|to go|Unlocked with|already|Reach level|Nothing|max/i;

test('never greys out a control without saying why (Brief §20.5)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Auditor', 'Warrior');

  for (const section of ['Character', 'Equipment', 'Alchemist', 'Summoning', 'Quests', 'Account']) {
    await goToSection(page, section);
    await page.waitForTimeout(200);

    const unexplained = await page.$$eval(
      'button[disabled], [aria-disabled="true"]',
      (nodes, pattern) => {
        const re = new RegExp(pattern, 'i');
        return nodes
          .filter((node) => (node as HTMLElement).offsetParent !== null)
          .filter((node) => {
            const el = node as HTMLElement;
            const tip =
              el.getAttribute('data-omf-tip') ??
              el.closest('[data-omf-tip]')?.getAttribute('data-omf-tip') ??
              '';
            if (tip.trim().length > 0) return false;
            const card = el.closest('.fui-itemcard, .omf-quests__card, .fui-panel');
            return !re.test(card?.textContent ?? '');
          })
          .map((node) => (node as HTMLElement).textContent?.trim().slice(0, 40) ?? '(no label)');
      },
      REFUSAL.source,
    );

    expect(unexplained, `${section}: silent disabled controls`).toEqual([]);
  }
});

test('asks the browser for nothing it does not ship (Brief §21)', async ({ page }) => {
  // A 404 in a shipped build is an unfinished edge (§2.1). The browser asks for
  // /favicon.ico on its own, so the game has to answer.
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) =>
    failures.push(`FAILED ${request.url()} ${request.failure()?.errorText}`),
  );

  await enterSelect(page);
  await createHero(page, 'Auditor', 'Mage');
  await goToSection(page, 'Character');
  expect(failures).toEqual([]);

  // And the tab carries the game's own mark rather than the browser's default.
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', /favicon/);
});

/**
 * The long-profile regression (ROADMAP M10).
 *
 * Everything else here starts from a fresh profile. This one plays a real
 * session — climbs, dies, raids back, shops, upgrades, claims — then reloads and
 * proves the save came back whole. It is the closest thing to "a player came
 * back the next day" that a test can be, and it is the run where a leak, a
 * missed write or a migration slip would actually show.
 */
test('a played-in profile survives a reload with everything intact', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await enterSelect(page);
  await createHero(page, 'Longhaul', 'Swashbuckler');
  await climb(page, 14);

  // Spend: the shop, a stat point, and whatever the board owes.
  await goToSection(page, 'Character');
  const buy = page.locator('[data-testid="character"]').getByRole('button', { name: /^Buy/ });
  if (
    await buy
      .first()
      .isEnabled()
      .catch(() => false)
  )
    await buy.first().click();

  await goToSection(page, 'Quests');
  await expect(page.locator('[data-testid="quests"]')).toBeVisible();
  await goToSection(page, 'Equipment');
  await expect(page.locator('[data-testid="merchant"]')).toBeVisible();

  // Snapshot what the player would recognise: their name, level and best floor.
  await goToSection(page, 'Character');
  const before = await page
    .locator('[data-testid="character"]')
    .innerText()
    .then((text) => text.replace(/\s+/g, ' '));
  // The screen renders names and headings uppercase in CSS, and `innerText`
  // reports what is painted rather than what the DOM holds — so this compares
  // case-insensitively rather than pretending otherwise.
  const level = /level (\d+)/i.exec(before)?.[1];
  expect(level, 'no level on the character screen').toBeTruthy();

  await page.reload();
  await page.getByRole('button', { name: /Enter the Spire/i }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();

  await goToSection(page, 'Character');
  const after = await page
    .locator('[data-testid="character"]')
    .innerText()
    .then((text) => text.replace(/\s+/g, ' '));

  expect(after.toLowerCase()).toContain('longhaul');
  expect(after.toLowerCase()).toContain(`level ${level}`);
  // The save reports itself as loaded, not created, recovered or corrupt.
  await expect(page.locator('[data-testid="save-status"]')).toHaveText(/Save loaded/i);
  expect(errors, 'console errors across a long session').toEqual([]);
});

/**
 * The Electron-forward guarantee, checked against the build rather than the
 * running page (ARCHITECTURE §6). A wrap loads `dist/index.html` from disk over
 * `file://`, where an absolute `/assets/...` resolves to the filesystem root and
 * nothing loads. So: every URL the build emits must be relative, and the only
 * remote-looking string in it must be the SVG namespace — which is an XML
 * identifier, never fetched.
 */
test('ships a build that would load from disk, not from a site root (ARCHITECTURE §6)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  const dist = join(process.cwd(), 'dist');
  const files = [
    'index.html',
    ...readdirSync(join(dist, 'assets')).map((name) => join('assets', name)),
  ].filter((name) => /\.(html|css|js)$/.test(name));
  expect(files.length, 'nothing in dist/ to check — did the build run?').toBeGreaterThan(2);

  const absolute: string[] = [];
  const remote: string[] = [];
  for (const file of files) {
    const source = readFileSync(join(dist, file), 'utf8');
    for (const [, url] of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (url.startsWith('/') || /^https?:/.test(url)) absolute.push(`${file}: ${url}`);
    }
    for (const [, url] of source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
      if (url.startsWith('/')) absolute.push(`${file}: ${url}`);
    }
    for (const [match] of source.matchAll(/https?:\/\/[\w./-]+/g)) {
      if (match !== 'http://www.w3.org/2000/svg') remote.push(`${file}: ${match}`);
    }
  }

  expect(absolute, 'absolute URLs break a file:// load').toEqual([]);
  expect(remote, 'the game must fetch nothing off-origin (Brief §21)').toEqual([]);
});

/**
 * Screens are built on enter and destroyed on exit, and a leaked listener is a
 * defect (CLAUDE.md). M10 found the shell dropping its screen on the floor:
 * routes passed `createTowerScreen({...}).el`, so nothing ever called the
 * screen's `destroy()` and every component inside it kept whatever it had
 * registered — ~41 listeners and ~91 retained nodes per screen visit, growing
 * without bound for as long as the player kept playing.
 *
 * This is the guard. It walks the whole game repeatedly and asserts the browser
 * is holding no more at the end than in the middle. Chromium-only: the counters
 * come from CDP, and one browser proving it is enough for a structural bug.
 */
test('does not leak a screen every time the player walks the game', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'needs CDP counters');
  test.slow();

  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('Performance.enable');

  const counts = async (): Promise<{ listeners: number; nodes: number }> => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const byName = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
    return { listeners: byName['JSEventListeners'] ?? 0, nodes: byName['Nodes'] ?? 0 };
  };

  const walk = async (): Promise<void> => {
    for (const section of [
      'Character',
      'Quests',
      'Equipment',
      'Alchemist',
      'Summoning',
      'Account',
      'Tower',
    ]) {
      await goToSection(page, section);
    }
  };

  // One walk first, so the comparison is steady-state against steady-state: the
  // first visit to a screen legitimately costs something later ones do not.
  await walk();
  const first = await counts();
  for (let round = 0; round < 4; round += 1) await walk();
  const last = await counts();

  /**
   * **Listeners must not grow at all.** That is the sharp instrument: when the
   * shell was dropping its screens, this climbed by about 41 *per screen visit*
   * and never came down.
   *
   * Nodes get a small allowance. Measured over eight consecutive walks the count
   * is flat, but it steps once by a few dozen as chrome that is built lazily
   * settles — the shared tooltip's own rendered card among it — and exactly when
   * that step lands depends on how the walk is paced. The allowance is far below
   * anything a real leak produces: the bug this test was written for retained
   * ~91 nodes per visit, which is thousands across these twenty-eight.
   */
  expect(
    last.listeners,
    `listeners grew ${first.listeners} → ${last.listeners}`,
  ).toBeLessThanOrEqual(first.listeners);
  expect(last.nodes, `retained nodes grew ${first.nodes} → ${last.nodes}`).toBeLessThanOrEqual(
    first.nodes + 80,
  );
});

/**
 * The round-one polish pass, as tests.
 *
 * Each of these covers something that was broken in a way no existing test could
 * see: a tooltip that carried a name and nothing else, gear sockets addressed by
 * an attribute the component never wrote, and a portrait that looked like a
 * button and wasn't.
 */
test('tells you what an item is, not just what it is called (Brief §20.4)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // Drops are rolled from the run's own seed, so "four floors" is a likelihood
  // rather than a promise — climb until the bag has something in it.
  const tooltip = page.locator('body > .fui-tooltip');
  const filled = page.locator('.omf-character__side .fui-inv .fui-slot:not(.fui-slot--empty)');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await climb(page, 4);
    await goToSection(page, 'Character');
    if ((await filled.count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  expect(await filled.count(), 'nothing dropped in twenty floors').toBeGreaterThan(0);

  await filled.first().hover();
  await expect(tooltip).toBeVisible();
  const card = await tooltip.innerText();

  // A name, what it is, where it goes, and at least one stat with a number.
  expect(card.split('\n').length, `thin tooltip: ${card}`).toBeGreaterThan(3);
  expect(card, 'no stat value in the card').toMatch(/[+-]\d/);

  // A worn piece says so; an empty socket says what it is waiting for.
  await page.locator('.fui-doll [data-slot-id="mainhand"]').hover();
  await expect(tooltip).toContainText(/Worn/i);
  await page.locator('.fui-doll [data-slot-id="helmet"]').hover();
  await expect(tooltip).toContainText(/Helmet/i);
});

test('every gear socket explains itself, including the shut ones (§7, §20.5)', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Character');

  const sockets = page.locator('.fui-doll [data-slot-id]');
  const count = await sockets.count();
  expect(count, 'the paperdoll rendered no addressable sockets').toBe(14);

  const silent: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const socket = sockets.nth(index);
    const id = await socket.getAttribute('data-slot-id');
    const tip = await socket.getAttribute('data-omf-tip');
    if (!tip || tip.trim().length === 0) silent.push(id ?? '(unnamed)');
  }
  expect(silent, 'sockets with nothing to say').toEqual([]);

  // The ascension sockets are shut at ascension 0, and say what opens them.
  await expect(page.locator('.fui-doll [data-slot-id="artifact"]')).toHaveAttribute(
    'data-omf-tip',
    /ascension/i,
  );
});

test('the portrait is the short way to the character sheet', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();

  await page.locator('[data-testid="hero-portrait"]').click();
  await expect(page.locator('[data-testid="character"]')).toBeVisible();

  // And it does not offer to take you where you already are (§2.1).
  await expect(page.locator('[data-testid="hero-portrait"]')).toBeDisabled();
});

test('the tower can be dragged as well as scrolled (§3.1)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await climb(page, 6);

  const scroller = page.locator('.fui-trail__scroller');
  const box = await scroller.boundingBox();
  expect(box, 'no trail to drag').not.toBeNull();
  if (!box) return;

  // The trail auto-scrolls to the floor you are standing on, which is usually
  // the bottom of it — so drag toward whichever end still has room, rather than
  // assuming the climb has somewhere further to go.
  const before = await scroller.evaluate((el) => ({
    top: el.scrollTop,
    max: el.scrollHeight - el.clientHeight,
  }));
  expect(before.max, 'the trail does not scroll at all').toBeGreaterThan(0);
  const downward = before.top > before.max / 2;

  const startY = box.y + box.height * (downward ? 0.25 : 0.75);
  await page.mouse.move(box.x + box.width * 0.2, startY);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(box.x + box.width * 0.2, startY + (downward ? step * 30 : -step * 30));
  }
  await page.mouse.up();

  const after = await scroller.evaluate((el) => el.scrollTop);
  if (downward) expect(after).toBeLessThan(before.top);
  else expect(after).toBeGreaterThan(before.top);
  // A drag is not a click: it must not have walked into a fight.
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();
});

/**
 * Round two, as tests. Each covers something a screenshot caught and no
 * assertion could: a grid wider than the frame around it, sockets that all
 * looked alike, and effect chips that named an affliction without saying what
 * it did.
 */
test('never lets an inventory grid hang out of its frame', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await climb(page, 4);

  const overflowing = async (): Promise<string[]> =>
    page.$$eval('.fui-inv', (grids) =>
      grids
        .filter((grid) => (grid as HTMLElement).offsetParent !== null)
        .flatMap((grid) => {
          const panel = grid.closest('.fui-panel');
          if (!panel) return [];
          const inner = grid.getBoundingClientRect();
          const outer = panel.getBoundingClientRect();
          // The ornate frame is ~46px of border-image a side; content must clear
          // it, so the grid is measured against the panel's padding box.
          const style = getComputedStyle(panel.querySelector('.fui-panel__body') ?? panel);
          const padLeft = Number.parseFloat(style.paddingLeft);
          const padRight = Number.parseFloat(style.paddingRight);
          const room = outer.width - padLeft - padRight;
          return inner.width > room + 1
            ? [`${grid.className}: grid ${Math.round(inner.width)}px in ${Math.round(room)}px`]
            : [];
        }),
    );

  await goToSection(page, 'Character');
  expect(await overflowing(), 'backpack').toEqual([]);
  await goToSection(page, 'Equipment');
  expect(await overflowing(), 'sell grid').toEqual([]);
});

test('shows what each empty gear socket is for', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Character');

  const missing = await page.$$eval('.omf-character__doll .fui-slot--empty', (sockets) =>
    sockets.flatMap((socket) => {
      const id = socket.getAttribute('data-slot-id');
      const icon = getComputedStyle(socket, '::after').maskImage;
      // The icon is bound per slot id, so the URL has to name that very slot —
      // which is what catches a column walked out of order.
      if (!id) return ['(socket with no slot id)'];
      return icon.includes(`${id}.svg`) ? [] : [`${id}: ${icon}`];
    }),
  );
  expect(missing, 'sockets without their own slot icon').toEqual([]);
});

test('says what a buff or debuff actually does (Brief §3.2)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // Floor modifiers are not on every floor, so climb until one turns up.
  const chip = page.locator('.omf-tower__preview .fui-buffs__item').first();
  for (let attempt = 0; attempt < 12 && (await chip.count()) === 0; attempt += 1) {
    await climb(page, 3);
  }
  test.skip((await chip.count()) === 0, 'no floor modifier came up in 36 floors');

  await chip.hover();
  const tooltip = page.locator('body > .fui-tooltip');
  await expect(tooltip).toBeVisible();
  const card = await tooltip.innerText();

  // A name and a duration are not enough: the card has to carry the number it
  // moves and a sentence about it.
  expect(card, `no magnitude in the card: ${card}`).toMatch(/[+−-]\d+%/);
  expect(card.split('\n').length, `thin effect card: ${card}`).toBeGreaterThan(3);
});

/**
 * Round three, as tests: the credits a licence actually asks for, and the drag
 * gestures — which are the first thing in this game that can be *aimed wrong*,
 * so each one is covered both landing and missing.
 */
test('credits what the game borrowed, where a player can reach it', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Account');

  const credits = page.locator('[data-testid="credits"]');
  await expect(credits).toBeVisible();

  // CC BY is the reason this screen exists at all: the licence wants the artists
  // named in front of the audience, not only in a file in the source tree.
  await expect(credits.getByText(/CC BY 3\.0/)).toBeVisible();
  await expect(credits.getByText(/Lorc, Delapouite/)).toBeVisible();
  await expect(credits.locator('[data-credit]')).toHaveCount(2);

  // §21: nothing on this screen sends the player off-origin.
  await expect(credits.locator('a')).toHaveCount(0);
});

/** A backpack cell whose piece wants `slot`, or null if the bag holds none. */
function bagCellFor(page: Page, slot: string) {
  return page.locator(`[data-testid="character"] .fui-inv [data-item-slot="${slot}"]`).first();
}

test('drags a piece out of the bag and onto the socket it belongs in', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // Climb until the bag holds something for a socket the hero can use.
  let slot = '';
  for (let attempt = 0; attempt < 8 && !slot; attempt += 1) {
    await climb(page, 3);
    await goToSection(page, 'Character');
    slot =
      (
        await page.$$eval('[data-testid="character"] .fui-inv [data-item-slot]', (cells) =>
          cells.map((cell) => (cell as HTMLElement).dataset.itemSlot ?? ''),
        )
      ).find((candidate) => candidate !== '') ?? '';
    if (!slot) await goToSection(page, 'Tower');
  }
  test.skip(!slot, 'no wearable drop came out of 24 floors');

  const socket = page.locator(`[data-testid="character"] [data-slot-id="${slot}"]`).first();
  await bagCellFor(page, slot).dragTo(socket);

  // The screen rebuilds on equip, so the proof is the toast that outlives it and
  // a socket that is no longer empty.
  await expect(page.locator('.fui-toast').getByText(/equipped/i)).toBeVisible();
  await expect(
    page.locator(`[data-testid="character"] [data-slot-id="${slot}"].fui-slot--empty`),
  ).toHaveCount(0);
});

test('refuses a drop the socket cannot take, and says why (§20.5)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  let slot = '';
  for (let attempt = 0; attempt < 8 && !slot; attempt += 1) {
    await climb(page, 3);
    await goToSection(page, 'Character');
    slot =
      (
        await page.$$eval('[data-testid="character"] .fui-inv [data-item-slot]', (cells) =>
          cells.map((cell) => (cell as HTMLElement).dataset.itemSlot ?? ''),
        )
      ).find((candidate) => candidate !== '') ?? '';
    if (!slot) await goToSection(page, 'Tower');
  }
  test.skip(!slot, 'no wearable drop came out of 24 floors');

  // Any *other* unlocked socket is the wrong one, whatever the piece turned out
  // to be — a helmet does not go on a boot, and nor does anything else.
  const wrong = page
    .locator(`[data-testid="character"] [data-slot-id]:not([data-slot-id="${slot}"])`)
    .first();
  await bagCellFor(page, slot).dragTo(wrong);

  const toast = page.locator('.fui-toast');
  await expect(toast).toBeVisible();
  // A refusal that only says "no" is the bug; the card has to carry a reason.
  expect((await toast.innerText()).split('\n').length).toBeGreaterThan(1);
});

const SELLABLE = '[data-testid="merchant"] .fui-inv .fui-slot:not(.fui-slot--empty)';

test('drags a piece to the merchant and sells it, once it is confirmed', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await climb(page, 3);
    await goToSection(page, 'Equipment');
    // The merchant's only `.fui-inv` is the sell bag; the shop's own stock is a
    // `.fui-shop__list`. `Slot` marks empty, never filled, so ask for not-empty.
    if ((await page.locator(SELLABLE).count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  const bag = page.locator(SELLABLE).first();
  test.skip((await bag.count()) === 0, 'no sellable drop came out of 24 floors');

  const gold = page.locator('.fui-currency__value').first();
  const goldBefore = await gold.innerText();
  await bag.dragTo(page.locator('[data-testid="merchant"] .fui-shop').first());

  // A sale cannot be undone, so it asks first — and the price is on the button.
  const dialog = page.locator('.fui-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Keep it/i })).toBeVisible();
  await dialog.getByRole('button', { name: /^Sell for/i }).click();

  await expect(page.locator('.fui-toast').getByText(/sold/i)).toBeVisible();
  await expect(gold).not.toHaveText(goldBefore);
});

test('a locked slot says what unlocks it without covering its own name', async ({ page }) => {
  await enterSelect(page);

  const overlaps = await page.$$eval('.fui-charsel__card', (cards) =>
    cards.flatMap((card) => {
      const name = card.querySelector('.fui-charsel__name');
      const lock = card.querySelector('.fui-charsel__lock');
      if (!name || !lock) return [];
      const a = name.getBoundingClientRect();
      const b = lock.getBoundingClientRect();
      // Both are pinned to the card's bottom edge, so a hint that wraps grows
      // straight up through the name unless the two are kept apart.
      return a.bottom > b.top + 0.5 ? [`${name.textContent}: name over hint`] : [];
    }),
  );
  expect(overlaps, 'slot labels colliding').toEqual([]);
});

test('offers Reset only for a slot that actually holds a hero', async ({ page }) => {
  await enterSelect(page);
  const reset = page.getByRole('button', { name: /Reset this slot/i });
  // Nothing to erase in an empty slot, so the row is not there to be clicked.
  await expect(reset).toBeHidden();

  await createHero(page, 'Grimhild', 'Warrior');
  await page.getByRole('button', { name: /Switch hero/i }).click();
  await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
  await expect(reset).toBeVisible();

  // And it survives a selection: the component rebuilds its detail column on
  // every click, which is what used to take Reset away with it.
  await page.locator('.fui-charsel__card').first().click();
  await expect(reset).toBeVisible();
});

/**
 * The rail. It is the only thing on screen at all times, so what it says has to
 * be true and what it draws has to stay inside it.
 */
test('the rail carries the numbers a player checks between actions', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const rail = page.locator('.omf-shell__rail');
  // Level and progress as numbers, not a coloured bar with nothing on it.
  await expect(rail.locator('[data-testid="rail-xp"]')).toContainText('Level 1');
  await expect(rail.locator('[data-testid="rail-xp"]')).toContainText('/');

  // Power decides the quality of everything the game will offer (§13), and the
  // backpack is finite (Q16) — both were a screen away.
  await expect(rail.getByText('PWR')).toBeVisible();
  await expect(rail.getByText('BAG')).toBeVisible();

  const climbPlate = rail.locator('[data-testid="rail-climb"]');
  await expect(climbPlate).toContainText('Floor 1');
  // The record a death never touches (§3.4), stated even before there is one.
  await expect(climbPlate).toContainText('Not yet');

  // And it tracks the hero rather than the screen build: clearing a floor moves
  // both numbers without the rail being rebuilt around them.
  await climb(page, 1);
  await expect(climbPlate).toContainText('Floor 2');
  await expect(climbPlate).not.toContainText('Not yet');
});

test('nothing in the rail grows through what is under it', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // The nav takes the rail's spare height, so on a window shorter than the rail
  // wants its rows would otherwise refuse to shrink and cover the button below.
  // The proof is the pointer: whatever is at Switch Hero's centre must be it.
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(size);
    const covered = await page.evaluate(() => {
      const rail = document.querySelector('.omf-shell__rail');
      const button = [...(rail?.querySelectorAll('button') ?? [])].find((candidate) =>
        /switch hero/i.test(candidate.textContent ?? ''),
      );
      if (!button) return 'no switch-hero button in the rail';
      // A window shorter than the rail scrolls it, which is the intended answer;
      // what must never happen is the nav sitting *on top* of what it scrolled
      // past. So look where the button actually is, not where it started.
      button.scrollIntoView({ block: 'center' });
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (!hit) return 'button is off-screen even after scrolling to it';
      return button.contains(hit) ? null : `covered by .${hit.className.split(' ').join('.')}`;
    });
    expect(covered, `Switch hero at ${size.width}x${size.height}`).toBeNull();
  }
});

/**
 * Round four: the two questions the game asks most often — "can I take this
 * floor?" and "is this piece better than the one I am wearing?" — answered
 * where they are asked rather than one screen away.
 */
test('the floor preview puts both sides of the fight side by side', async ({ page }) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const matchup = page.locator('[data-testid="floor-matchup"]');
  await expect(matchup).toBeVisible();

  // Every stat the preview claims to compare has a number for each side.
  const rows = await matchup.locator('.omf-tower__cmp').all();
  expect(rows.length, 'stats compared').toBe(5);
  for (const row of rows) {
    const lead = await row.getAttribute('data-lead');
    expect(['you', 'them', 'level']).toContain(lead);
    await expect(row.locator('.omf-tower__cmp-mine')).toHaveText(/^\d+$/);
    await expect(row.locator('.omf-tower__cmp-theirs')).toHaveText(/^\d+$/);
  }

  // And what clearing it pays, before the fight rather than in the aftermath.
  await expect(page.locator('[data-testid="floor-pays"]')).toContainText('~');

  // The hero's own face marks the floor they are standing on.
  await expect(page.locator('[data-testid="tower-here"]')).toBeVisible();
});

test('a gear tooltip leads with the verdict, not with the stat block', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const bag = page.locator('.omf-character__side .fui-inv .fui-slot:not(.fui-slot--empty)');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await climb(page, 4);
    await goToSection(page, 'Character');
    if ((await bag.count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  expect(await bag.count(), 'nothing dropped in twenty floors').toBeGreaterThan(0);

  await bag.first().hover();
  const tooltip = page.locator('body > .fui-tooltip');
  await expect(tooltip).toBeVisible();
  const lines = (await tooltip.innerText()).split('\n').filter(Boolean);

  // The verdict is the first thing under the item's own header — a player asking
  // "is this better?" should not have to read to the bottom of the card.
  const verdict = lines.findIndex((line) => /upgrade|worse|sidegrade|nothing worn/i.test(line));
  expect(verdict, `no verdict in the card: ${lines.join(' / ')}`).toBeGreaterThanOrEqual(0);
  expect(verdict, 'verdict is buried under the stat block').toBeLessThan(4);

  // And every stat that moves is written as a swap, not a bare delta.
  expect(lines.join('\n'), 'no before → after anywhere').toMatch(/\d+\s*→\s*\d+/);
});

test('marks the bag pieces worth wearing without being hovered', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const bag = page.locator('.omf-character__side .fui-inv .fui-slot:not(.fui-slot--empty)');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await climb(page, 4);
    await goToSection(page, 'Character');
    if ((await bag.count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  expect(await bag.count(), 'nothing dropped in twenty floors').toBeGreaterThan(0);

  // A fresh Warrior wears three pieces, so most of what drops fills an empty
  // socket — at least one bag slot must carry the mark.
  await expect(page.locator('.omf-character__side .fui-inv .omf-upgrade').first()).toBeVisible();

  // The shelf says it in words, and says the same thing the tooltip does.
  await goToSection(page, 'Equipment');
  const marked = page.locator('.fui-shop__list .fui-itemcard.omf-upgrade').first();
  if ((await marked.count()) > 0) {
    await expect(marked).toContainText(/Upgrade/i);
  }
});

/**
 * Round five, the tower half: the climb keeps a record of itself, marks what it
 * has already reached, and can be handed over to a timer.
 */
test('the trail marks the milestones ahead of the hero', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  // The trail draws ahead only (Q23), so the first milestone at floor 25 comes
  // into view once the hero is deep enough for it to be within the look-ahead.
  await climb(page, 8);
  await expect(page.locator('.omf-tower__milestone').first()).toBeVisible();
});

test('auto-climb offers three states and refuses the one not yet earned (§20.5)', async ({
  page,
}) => {
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');

  const auto = page.locator('[data-testid="auto-climb"]');
  await expect(auto).toBeVisible();
  await expect(auto.locator('button')).toHaveCount(3);

  // Background climbing is level-gated, and a gate has to say what opens it
  // rather than hiding the door.
  const background = page.locator('[data-testid="auto-background"]');
  await expect(background).toBeDisabled();
  await background.hover({ force: true });
  await expect(page.locator('body > .fui-tooltip')).toContainText(/level/i);

  // Watching is available from the first floor, and switching it on sticks.
  await page.locator('[data-testid="auto-watching"]').click();
  await expect(page.locator('[data-testid="auto-watching"]')).toHaveClass(/is-on/);
});

test('a finished run becomes a line in the records, and the record gets a ghost', async ({
  page,
}) => {
  test.slow();
  await enterSelect(page);
  // The Swashbuckler dies shallowest in the balance sim, which is what makes her
  // the right hero for a test that has to actually die.
  await createHero(page, 'Grimhild', 'Swashbuckler');

  await goToSection(page, 'Records');
  await expect(page.locator('[data-testid="records"]')).toContainText(/No run has ended yet/i);
  await goToSection(page, 'Tower');

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
    await oneMore.click();
    await expect(page.locator('[data-testid="combat-screen"]')).toBeVisible();
  }
  await expect(death).toBeVisible();
  // Walking back in rather than raiding: the Spire at Floor 1, below the record.
  await page.getByRole('button', { name: /Climb again/i }).click();
  await expect(page.locator('[data-testid="tower"]')).toBeVisible();

  // From down here the trail marks where the last climb reached.
  await expect(page.locator('[data-testid="best-floor-ghost"]')).toBeVisible();

  // The run that just ended is written down.
  await goToSection(page, 'Records');
  const row = page.locator('[data-testid="run-0"]');
  await expect(row, 'the run that just ended').toBeVisible();
  await expect(row).toContainText(/Floor \d+/);
  await expect(row).toContainText(/gold/i);
});

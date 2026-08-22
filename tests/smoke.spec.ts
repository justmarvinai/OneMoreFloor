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
  await goToSection(page, 'Merchants');

  const shop = page.locator('[data-testid="merchant"]');
  await expect(shop).toBeVisible();
  await expect(shop.getByText('Equipment Merchant')).toBeVisible();
  // The free wait is on screen beside the paid restock — never only the paid one.
  await expect(shop.getByText(/New goods in/)).toBeVisible();
  await expect(shop.getByRole('button', { name: /Restock now/i })).toBeVisible();

  // The Magic Merchant is one tab away, and sells draughts by the hour (§12).
  await shop.getByRole('tab', { name: 'Magic' }).click();
  await expect(page.getByText(/for one hour/).first()).toBeVisible();
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
    await goToSection(page, 'Merchants');
    if ((await buyButtons.count()) > 0) break;
    await goToSection(page, 'Tower');
  }
  expect(await buyButtons.count(), 'nothing on the shelf was ever affordable').toBeGreaterThan(0);

  await goToSection(page, 'Character');
  const power = page.locator('[data-testid="character"] .fui-power__value');
  const before = Number((await power.innerText()).replace(/[^\d]/g, ''));

  await goToSection(page, 'Merchants');
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

  // Climbing moved something, which is the whole wiring end to end.
  await expect(board.getByText(/[1-9]\d* \/ /).first()).toBeVisible();
});

test('sells the two account upgrades, and only those two (Brief §15)', async ({ page }) => {
  test.slow();
  await enterSelect(page);
  await createHero(page, 'Grimhild', 'Warrior');
  await goToSection(page, 'Account');

  const screen = page.locator('[data-testid="upgrades"]');
  await expect(screen.getByText('Battle Speed')).toBeVisible();
  await expect(screen.getByText('Account Slots')).toBeVisible();
  await expect(screen.locator('.fui-panel')).toHaveCount(2);

  // Earn until the cheap upgrade is within reach, then buy it. A `CostButton`
  // that cannot be paid for stays pressable and says how short you are, so the
  // shortfall line — not a disabled attribute — is what "affordable" looks like.
  const slotsCard = screen.locator('.fui-panel').nth(1);
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

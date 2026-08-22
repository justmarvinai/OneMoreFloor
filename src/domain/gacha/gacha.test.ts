import { describe, expect, it } from 'vitest';
import { BANNERS, bannerConfig, bannerOdds } from '@/content/balance/gacha.ts';
import { INVENTORY_CAPACITY } from '@/domain/items/inventory.ts';
import { createCharacter } from '@/domain/character/character.ts';
import { availableSlots } from '@/domain/items/equip.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import type { Character } from '@/domain/character/types.ts';
import { RARITIES } from '@/domain/items/types.ts';
import { canPull, currencyHeld, pull, spendCurrency } from './gacha.ts';

function hero(overrides: Partial<Character> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: 0,
    runSeed: 'gacha-test',
  });
  return {
    ...base,
    progression: { level: 60, xp: 0, ascension: 2 },
    currencies: { gold: 0, tickets: 5, luckyTickets: 5 },
    ...overrides,
  };
}

const BRACKET = bracketAt(6);

/** Did this pull actually hand the player something? (Q20) */
function paid(result: ReturnType<typeof pull>): boolean {
  return (
    result.item !== null ||
    result.reward.gold > 0 ||
    Object.values(result.reward.materials).some((count) => count > 0)
  );
}

describe('gacha pulls', () => {
  it('never pays nothing (Q20: every pull gives something)', () => {
    const character = hero();
    for (const banner of BANNERS) {
      for (let pullNumber = 0; pullNumber < 500; pullNumber += 1) {
        const result = pull({ character, banner: banner.id, bracket: BRACKET, pullNumber });
        expect(paid(result), `${banner.id} pull ${pullNumber} paid nothing`).toBe(true);
      }
    }
  });

  it('replays exactly, given the same save and the same pull number', () => {
    // A support answer to "the game ate my legendary" is only possible if the
    // pull can be re-run from the save (ARCHITECTURE §5).
    const character = hero();
    const first = pull({ character, banner: 'ticket', bracket: BRACKET, pullNumber: 17 });
    const second = pull({ character, banner: 'ticket', bracket: BRACKET, pullNumber: 17 });
    expect(second).toEqual(first);
  });

  it('draws a different stream for every pull', () => {
    const character = hero();
    const seen = new Set<string>();
    for (let pullNumber = 0; pullNumber < 60; pullNumber += 1) {
      const result = pull({ character, banner: 'ticket', bracket: BRACKET, pullNumber });
      seen.add(`${result.entryId}:${result.item?.uid ?? result.reward.gold}`);
    }
    // Not "all different" — the table is small enough that collisions are
    // expected — but a stuck stream would collapse this to one.
    expect(seen.size).toBeGreaterThan(20);
  });

  it('runs the odds it prints (Brief §16.2, honest rates)', () => {
    const character = hero();
    const runs = 40_000;

    for (const banner of BANNERS) {
      const counts = new Map<string, number>();
      for (let pullNumber = 0; pullNumber < runs; pullNumber += 1) {
        const result = pull({ character, banner: banner.id, bracket: BRACKET, pullNumber });
        counts.set(result.entryId, (counts.get(result.entryId) ?? 0) + 1);
      }

      for (const { entry, chance } of bannerOdds(banner.id)) {
        const observed = (counts.get(entry.id) ?? 0) / runs;
        // Generous tolerance: this is asserting the table is wired to the
        // draw, not measuring the RNG's quality (that is `rng.test.ts`).
        expect(
          Math.abs(observed - chance),
          `${entry.id}: printed ${chance}, ran ${observed}`,
        ).toBeLessThan(Math.max(0.004, chance * 0.15));
      }
    }
  });

  it('keeps the jackpots extremely rare (Brief §16.2)', () => {
    const ticket = bannerOdds('ticket').find((row) => row.entry.id === 'gacha.ticket.legendary');
    const lucky = bannerOdds('lucky').find((row) => row.entry.id === 'gacha.lucky.mythic');

    expect(ticket?.chance).toBeLessThan(0.05);
    expect(lucky?.chance).toBeLessThan(0.01);
  });

  it('never pays below Epic on the Lucky banner', () => {
    // The rarest currency in the game may not buy a bundle of ore.
    const character = hero();
    for (let pullNumber = 0; pullNumber < 400; pullNumber += 1) {
      const result = pull({ character, banner: 'lucky', bracket: BRACKET, pullNumber });
      expect(result.item).not.toBeNull();
      expect(['epic', 'legendary', 'mythic']).toContain(result.item?.rarity);
    }
  });

  it('only ever hands out gear the hero could wear', () => {
    // A pull that pays a class-locked weapon for another class is a pull that
    // paid nothing, whatever the rarity ribbon said — and so is one for a slot
    // this ascension has not unlocked (Brief §5).
    const character = hero();
    const wearable = new Set<string>(availableSlots(character.progression.ascension));

    for (let pullNumber = 0; pullNumber < 300; pullNumber += 1) {
      const result = pull({ character, banner: 'lucky', bracket: BRACKET, pullNumber });
      const def = requireItemDef(result.item!.defId);
      expect(wearable, `pull ${pullNumber} paid a ${def.slot}`).toContain(def.slot);
      expect([null, character.identity.classId]).toContain(def.classId);
    }
  });

  it('never lets the build undersell the prize (Brief §16.3)', () => {
    // The one rule that keeps a fake-out honest: the animation may over-sell,
    // never under-sell. A Mythical staged like a bundle of ore would read as the
    // game hiding the best thing that ever happened to the player.
    const character = hero();
    for (const banner of BANNERS) {
      for (let pullNumber = 0; pullNumber < 800; pullNumber += 1) {
        const result = pull({ character, banner: banner.id, bracket: BRACKET, pullNumber });
        const trueRank = result.rarity ? RARITIES.indexOf(result.rarity) : 0;
        expect(result.bluff, `${banner.id} pull ${pullNumber}`).toBeGreaterThanOrEqual(trueRank);
      }
    }
  });

  it('still bluffs often enough for the fake-out to exist', () => {
    // The mirror of the rule above: a bluff that never over-sells is not a
    // fake-out, it is a rarity readout the player learns to read in an evening.
    const character = hero();
    let overSold = 0;
    const runs = 600;
    for (let pullNumber = 0; pullNumber < runs; pullNumber += 1) {
      const result = pull({ character, banner: 'ticket', bracket: BRACKET, pullNumber });
      const trueRank = result.rarity ? RARITIES.indexOf(result.rarity) : 0;
      if (result.bluff > trueRank) overSold += 1;
    }
    expect(overSold / runs).toBeGreaterThan(0.2);
  });

  it('replays its bluff along with its prize', () => {
    const character = hero();
    const first = pull({ character, banner: 'lucky', bracket: BRACKET, pullNumber: 3 });
    const second = pull({ character, banner: 'lucky', bracket: BRACKET, pullNumber: 3 });
    expect(second.bluff).toBe(first.bluff);
  });

  it('refuses without the currency, and says which one is missing', () => {
    const broke = hero({ currencies: { gold: 10_000, tickets: 0, luckyTickets: 3 } });
    expect(canPull(broke, 'ticket')).toBe('noCurrency');
    expect(canPull(broke, 'lucky')).toBe(true);
    expect(currencyHeld(broke, 'lucky')).toBe(3);
  });

  it('refuses on a full backpack rather than evaporating the prize (Q16)', () => {
    const character = hero();
    const stuffed = {
      ...character,
      inventory: Array.from({ length: INVENTORY_CAPACITY }, (_, index) => ({
        ...character.equipment.mainhand!,
        uid: `filler-${index}`,
      })),
    };
    expect(canPull(stuffed, 'ticket')).toBe('backpackFull');
  });

  it('spends the banner’s own currency and nothing else', () => {
    const character = hero();
    const after = spendCurrency(character, 'lucky');
    expect(after.currencies.luckyTickets).toBe(character.currencies.luckyTickets - 1);
    expect(after.currencies.tickets).toBe(character.currencies.tickets);
    expect(after.currencies.gold).toBe(character.currencies.gold);
  });

  it('prices its gold against the hero’s depth, not a fixed number', () => {
    // A 26-floor bundle has to still mean something on floor 400, which it only
    // does if it is priced at the hero's own income.
    const shallow = hero({ tower: { ...hero().tower, highestFloorEverCleared: 5 } });
    const deep = hero({ tower: { ...hero().tower, highestFloorEverCleared: 300 } });

    const goldOf = (character: Character): number => {
      let total = 0;
      for (let pullNumber = 0; pullNumber < 200; pullNumber += 1) {
        total += pull({ character, banner: 'ticket', bracket: BRACKET, pullNumber }).reward.gold;
      }
      return total;
    };

    expect(goldOf(deep)).toBeGreaterThan(goldOf(shallow) * 10);
  });
});

describe('banner configuration', () => {
  it('spends no weight on nothing', () => {
    for (const banner of BANNERS) {
      expect(banner.entries.length).toBeGreaterThan(0);
      for (const entry of banner.entries) expect(entry.weight).toBeGreaterThan(0);
    }
  });

  it('prints odds that sum to one', () => {
    for (const banner of BANNERS) {
      const total = bannerOdds(banner.id).reduce((sum, row) => sum + row.chance, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('gives each banner its own currency', () => {
    expect(bannerConfig('ticket').currency).toBe('tickets');
    expect(bannerConfig('lucky').currency).toBe('luckyTickets');
  });

  it('throws on an unknown banner rather than paying from a default', () => {
    // @ts-expect-error — the point of the guard is the runtime, not the type.
    expect(() => bannerConfig('mystery')).toThrow();
  });
});

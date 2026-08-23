import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES } from '@/content/items/index.ts';
import { BRACKET_COUNT } from '@/content/balance/items.ts';
import { createCharacter, totalStatsOf, equippedItems } from '@/domain/character/character.ts';
import { affixBudget, itemStats } from '@/domain/items/derive.ts';
import { generateItem } from '@/domain/items/generate.ts';
import { RARITIES, type Rarity } from '@/domain/items/types.ts';
import { MERCHANT_IDS, restock, stockOf } from '@/domain/merchants/merchants.ts';
import { BANNERS } from '@/content/balance/gacha.ts';
import { pull } from '@/domain/gacha/gacha.ts';
import { bracketAt, bracketFor, isWithinBracket } from './brackets.ts';
import { powerLevel } from './power.ts';

/**
 * **The permanent anti-overshoot guard (Brief §13, BALANCE.md §6).**
 *
 * The brief's rule in one sentence: *rarity decides how good an item is within a
 * bracket; Power Level decides the bracket.* This file is the mechanism that
 * keeps that true for the life of the project — it is CI-permanent from M2
 * onwards, and every future item source (merchants in M5, gacha in M7) inherits
 * it by construction, because all of them generate through `generateItem`.
 *
 * Note what is asserted: the budget an item **actually gives**, recomputed from
 * its rolled affixes, not the number the roll happened to produce. Asserting the
 * latter would pass forever while saying nothing.
 */

const SEEDS_PER_CASE = 60;

/**
 * The ladder is two hundred brackets long, so the exhaustive sweeps below walk
 * every one of the first forty — the range a player realistically reaches — and
 * then every tenth after that. The sampling is stated out loud rather than left
 * implicit: a sweep that quietly skipped most of its range would read as
 * "covered everything" while covering a fifth of it.
 */
const DENSE_BRACKETS = 40;
const SPARSE_STEP = 10;

function sweptBrackets(): number[] {
  const indices: number[] = [];
  for (let index = 0; index < BRACKET_COUNT; index += 1) {
    if (index < DENSE_BRACKETS || index % SPARSE_STEP === 0) indices.push(index);
  }
  return indices;
}

describe('anti-overshoot: no source may exceed the requester’s bracket', () => {
  it('holds for every bracket, every rarity, every base type', () => {
    let generated = 0;

    for (const index of sweptBrackets()) {
      const bracket = bracketAt(index);

      for (const def of ITEM_BASES) {
        for (const rarity of RARITIES) {
          for (let seed = 0; seed < 4; seed += 1) {
            const item = generateItem({
              def,
              rarity,
              bracket,
              weights: affixPool(def.affixPool),
              rng: createRng(`overshoot:${index}:${def.id}:${rarity}:${seed}`),
              uid: `test-${generated}`,
            });

            const realised = affixBudget(item);
            expect(
              realised,
              `${def.id} ${rarity} at bracket ${index} gave ${realised}, ceiling ${bracket.window.max}`,
            ).toBeLessThanOrEqual(bracket.window.max + 1e-6);
            expect(item.bracketAtDrop).toBe(index);
            generated += 1;
          }
        }
      }
    }

    // Guard against the sweep silently shrinking to nothing.
    expect(generated).toBeGreaterThan(10_000);
  });

  it('holds for both merchants, at every bracket (Brief §11/§12)', () => {
    // M5 added a second and third item source. They inherit the guarantee by
    // going through `generateItem`, and this proves it through the shop's own
    // code path rather than trusting that they do.
    let sold = 0;

    for (const index of sweptBrackets()) {
      const bracket = bracketAt(index);
      const character = {
        ...createCharacter({
          slotId: 1,
          name: 'Grimhild',
          classId: 'warrior',
          createdAt: 0,
          runSeed: `overshoot-shop:${index}`,
        }),
        progression: { level: 900, xp: 0, ascension: 5 as const },
      };

      for (const id of MERCHANT_IDS) {
        const state = restock(id, `overshoot:${index}`, {
          now: 0,
          bracketIndex: index,
          highestFloor: index * 10,
        });
        for (const entry of stockOf(id, character, state, bracket)) {
          const realised = affixBudget(entry.item);
          expect(
            realised,
            `${id} at bracket ${index} sold ${entry.item.defId} for ${realised}, ceiling ${bracket.window.max}`,
          ).toBeLessThanOrEqual(bracket.window.max + 1e-6);
          sold += 1;
        }
      }
    }

    expect(sold).toBeGreaterThan(200);
  });

  it('holds for both gacha banners, at every bracket (Brief §16.2)', () => {
    // The brief singles the gacha out — "all gacha rewards are bracketed by
    // Power Level, no overshooting" — so it gets its own sweep even though it
    // shares `generateItem` with everything else. The point is to catch the day
    // someone adds a gacha-only generator for a "special" banner item.
    let pulled = 0;
    let gearSeen = 0;

    for (const index of sweptBrackets()) {
      const bracket = bracketAt(index);
      const character = {
        ...createCharacter({
          slotId: 1,
          name: 'Grimhild',
          classId: 'warrior',
          createdAt: 0,
          runSeed: `overshoot-gacha:${index}`,
        }),
        // Ascended to the cap so every equipment slot is unlocked: a slot the
        // hero cannot wear yet is a slot this sweep would never test.
        progression: { level: 900, xp: 0, ascension: 5 as const },
      };

      for (const banner of BANNERS) {
        for (let pullNumber = 0; pullNumber < 40; pullNumber += 1) {
          const result = pull({ character, banner: banner.id, bracket, pullNumber });
          pulled += 1;
          if (!result.item) continue;

          const realised = affixBudget(result.item);
          expect(
            realised,
            `${banner.id} at bracket ${index} paid ${result.item.defId} worth ${realised}, ceiling ${bracket.window.max}`,
          ).toBeLessThanOrEqual(bracket.window.max + 1e-6);
          expect(result.item.bracketAtDrop).toBe(index);
          gearSeen += 1;
        }
      }
    }

    expect(pulled).toBeGreaterThan(1_000);
    // The Lucky banner is gear-only, so a sweep that saw no gear would be a
    // sweep that silently stopped generating items.
    expect(gearSeen).toBeGreaterThan(pulled / 2);
  });

  it('never lets a higher rarity escape the bracket a lower one sits in', () => {
    const bracket = bracketAt(6);
    const ceiling = bracket.window.max;

    for (const rarity of RARITIES) {
      for (let seed = 0; seed < SEEDS_PER_CASE; seed += 1) {
        const item = generateItem({
          def: ITEM_BASES[0],
          rarity,
          bracket,
          weights: affixPool(ITEM_BASES[0].affixPool),
          rng: createRng(`rarity-escape:${rarity}:${seed}`),
          uid: 'x',
        });
        expect(affixBudget(item)).toBeLessThanOrEqual(ceiling + 1e-6);
      }
    }
  });

  it('still ranks rarity meaningfully inside the bracket', () => {
    // The rule must not flatten rarity into decoration: a mythic should be worth
    // several commons, while staying inside the same window.
    const bracket = bracketAt(10);
    const average = (rarity: Rarity): number => {
      let total = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        const item = generateItem({
          def: ITEM_BASES[0],
          rarity,
          bracket,
          weights: affixPool(ITEM_BASES[0].affixPool),
          rng: createRng(`ranking:${rarity}:${seed}`),
          uid: 'x',
        });
        total += affixBudget(item);
      }
      return total / 200;
    };

    const common = average('common');
    const mythic = average('mythic');

    expect(mythic).toBeGreaterThan(common * 3);
    expect(isWithinBracket(bracket, mythic)).toBe(true);
  });

  it('refuses the brief’s canonical case: no +1000 Strength chest at Level 12, Floor 21', () => {
    // Brief §13, verbatim: "A player at Ascension 0, Level 12, Floor 21 must
    // never obtain a +1000 Strength chestplate — from any source, including
    // gacha and Mythical drops."
    const hero = createCharacter({
      slotId: 1,
      name: 'Testficus',
      classId: 'warrior',
      createdAt: 0,
      runSeed: 'canonical',
    });
    const midGame = {
      ...hero,
      progression: { level: 12, xp: 0, ascension: 0 as const },
      tower: { ...hero.tower, highestFloorEverCleared: 21 },
    };

    const bracket = bracketFor(
      powerLevel({
        equipped: equippedItems(midGame),
        stats: totalStatsOf(midGame),
        ascension: midGame.progression.ascension,
        highestFloorEverCleared: midGame.tower.highestFloorEverCleared,
      }),
    );

    const chest = ITEM_BASES.find((def) => def.slot === 'chest');
    expect(chest).toBeDefined();

    let worstStrength = 0;
    for (let seed = 0; seed < 3_000; seed += 1) {
      // Mythical — the best the game can produce, from any source.
      const item = generateItem({
        def: chest!,
        rarity: 'mythic',
        bracket,
        weights: affixPool(chest!.affixPool),
        rng: createRng(`canonical:${seed}`),
        uid: 'x',
      });
      worstStrength = Math.max(worstStrength, itemStats(item).strength);
    }

    // Not "we checked and it did not happen" — at this bracket the item is not
    // constructible. The ceiling itself is far below 1000 points of Strength.
    expect(worstStrength).toBeLessThan(1_000);
    expect(bracket.window.max).toBeLessThan(1_000);
  });

  it('lets the same source hand out that chestplate once the player has earned it', () => {
    // The mirror of the rule: brackets gate, they do not cap the game. A
    // late-game character must be able to receive gear a beginner cannot.
    const deep = bracketFor(1_000_000);
    const chest = ITEM_BASES.filter((def) => def.slot === 'chest').at(-1)!;

    let best = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      const item = generateItem({
        def: chest,
        rarity: 'mythic',
        bracket: deep,
        weights: affixPool(chest.affixPool),
        rng: createRng(`deep:${seed}`),
        uid: 'x',
      });
      best = Math.max(best, itemStats(item).strength + itemStats(item).hp);
    }

    expect(best).toBeGreaterThan(1_000);
  });
});

describe('brackets', () => {
  it('rise monotonically in both power and budget', () => {
    for (let index = 1; index < BRACKET_COUNT; index += 1) {
      const previous = bracketAt(index - 1);
      const current = bracketAt(index);
      expect(current.minPower).toBeGreaterThan(previous.minPower);
      expect(current.window.max).toBeGreaterThan(previous.window.max);
      expect(current.referenceBudget).toBeGreaterThan(previous.referenceBudget);
    }
  });

  it('places every power level in exactly one bracket', () => {
    for (const power of [0, 1, 59, 60, 61, 500, 10_000, 5_000_000]) {
      const bracket = bracketFor(power);
      expect(power).toBeGreaterThanOrEqual(bracket.minPower);
      if (bracket.index < BRACKET_COUNT - 1) {
        expect(power).toBeLessThan(bracketAt(bracket.index + 1).minPower);
      }
    }
  });

  it('clamps rather than throwing outside the authored range', () => {
    expect(bracketAt(-5).index).toBe(0);
    expect(bracketAt(9_999).index).toBe(BRACKET_COUNT - 1);
    // The ladder now runs deeper than any reachable Power Level: even the
    // largest safe integer lands well inside it, which is the point — a player
    // must never meet the top of the bracket table (M9).
    const extreme = bracketFor(Number.MAX_SAFE_INTEGER).index;
    expect(extreme).toBeGreaterThan(40);
    expect(extreme).toBeLessThan(BRACKET_COUNT - 1);
    expect(bracketFor(Number.POSITIVE_INFINITY).index).toBe(0);
  });

  it('starts a fresh hero in the first bracket', () => {
    const hero = createCharacter({
      slotId: 1,
      name: 'Newborn',
      classId: 'mage',
      createdAt: 0,
      runSeed: 'fresh',
    });
    const power = powerLevel({
      equipped: equippedItems(hero),
      stats: totalStatsOf(hero),
      ascension: 0,
      highestFloorEverCleared: 0,
    });
    expect(bracketFor(power).index).toBeLessThanOrEqual(1);
  });
});

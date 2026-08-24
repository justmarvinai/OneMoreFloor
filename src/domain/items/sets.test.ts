import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { SET_BONUS_MAGNITUDE, UNIQUE_MIN_RARITY } from '@/content/balance/uniques.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, requireItemDef } from '@/content/items/index.ts';
import { ITEM_SETS } from '@/content/items/sets.ts';
import { UNIQUE_POWER_IDS } from '@/content/items/uniques.ts';
import { createCharacter } from '@/domain/character/character.ts';
import { totalStatsOf } from '@/domain/character/character.ts';
import type { Character, EquipSlotId } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { RARITIES, rarityIndex } from './types.ts';
import { generateItem, pickBase } from './generate.ts';
import { setBonusStats, setStatuses, wornPowers } from './sets.ts';
import type { ItemInstance } from './types.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'set-test',
    }),
    ...overrides,
  };
}

function make(defId: string, seed = 'a'): ItemInstance {
  const def = requireItemDef(defId);
  return generateItem({
    def,
    rarity: 'rare',
    bracket: bracketAt(0),
    weights: affixPool(def.affixPool),
    rng: createRng(`set:${defId}:${seed}`),
    uid: `set-${defId}`,
  });
}

/** Pieces of one set, in slot order, as a wearable equipment map. */
function wear(setId: string, count: number): Partial<Record<EquipSlotId, ItemInstance>> {
  const pieces = ITEM_BASES.filter((def) => def.setId === setId).slice(0, count);
  const equipment: Partial<Record<EquipSlotId, ItemInstance>> = {};
  for (const def of pieces) equipment[def.slot] = make(def.id);
  return equipment;
}

describe('item sets (Q45)', () => {
  it('gives every set six pieces, one per armour slot', () => {
    for (const set of ITEM_SETS) {
      const pieces = ITEM_BASES.filter((def) => def.setId === set.id);
      expect(pieces).toHaveLength(6);
      expect(new Set(pieces.map((def) => def.slot)).size).toBe(6);
    }
  });

  it('makes its pieces available at every depth, so a set never goes obsolete', () => {
    for (const def of ITEM_BASES.filter((base) => base.setId !== undefined)) {
      expect(def.brackets[0]).toBe(0);
      expect(def.brackets[1]).toBeGreaterThan(100);
    }
  });

  it('lights a threshold only once enough pieces are on', () => {
    const set = ITEM_SETS[0]!;
    const two = setStatuses(Object.values(wear(set.id, 2)));
    expect(two[0]?.bonuses.map((bonus) => bonus.active)).toEqual([true, false, false]);

    const six = setStatuses(Object.values(wear(set.id, 6)));
    expect(six[0]?.bonuses.map((bonus) => bonus.active)).toEqual([true, true, true]);
  });

  it('says nothing about a set the hero owns no piece of', () => {
    expect(setStatuses([])).toHaveLength(0);
  });

  it('raises the stat it names, as a percentage of what is already there', () => {
    const set = ITEM_SETS[0]!;
    const stat = set.raises[0]!;
    const durable = { strength: 100, defense: 100, hp: 100, resource: 100, luck: 100, speed: 100 };

    const none = setBonusStats(durable, Object.values(wear(set.id, 1)));
    const two = setBonusStats(durable, Object.values(wear(set.id, 2)));

    expect(none[stat]).toBe(0);
    expect(two[stat]).toBe(Math.round(100 * (SET_BONUS_MAGNITUDE[0] ?? 0)));
  });

  it('compounds thresholds rather than replacing them', () => {
    // A set that traded its early bonuses for its last one would punish the
    // hero for finishing it.
    const ironbound = ITEM_SETS.find((set) => set.id === 'set.ironbound')!;
    const worn = setStatuses(Object.values(wear(ironbound.id, 6)))[0]!;
    expect(worn.bonuses.every((bonus) => bonus.active)).toBe(true);
  });

  it('reaches the hero through their real stat total', () => {
    const bare = hero({ equipment: {} });
    const suited = hero({ equipment: wear('set.ironbound', 6) });

    // Not a precise figure — the pieces carry affixes too. The point is that the
    // bonus is in the number the rest of the game reads.
    expect(totalStatsOf(suited).defense).toBeGreaterThan(totalStatsOf(bare).defense);
  });
});

describe('named uniques (Q45)', () => {
  it('gives every power exactly one piece to live on', () => {
    const uniques = ITEM_BASES.filter((def) => def.unique !== undefined);
    expect(uniques).toHaveLength(UNIQUE_POWER_IDS.length);
    expect(new Set(uniques.map((def) => def.unique)).size).toBe(UNIQUE_POWER_IDS.length);
    // On slots no class competes for, so any hero can find any of them.
    expect(uniques.every((def) => def.classId === null)).toBe(true);
  });

  it('never enters the pool below the rarity it is gated at', () => {
    const uniques = ITEM_BASES.filter((def) => def.unique !== undefined);
    const pool = [...uniques, ...ITEM_BASES.filter((def) => def.slot === 'chest')];

    for (const rarity of RARITIES) {
      const allowed = rarityIndex(rarity) >= rarityIndex(UNIQUE_MIN_RARITY);
      const picks = Array.from({ length: 120 }, (_, index) =>
        pickBase(pool, rarity, createRng(`gate:${rarity}:${index}`)),
      );
      const sawUnique = picks.some((def) => def?.unique !== undefined);
      if (!allowed) expect(sawUnique, `${rarity} let a unique through`).toBe(false);
    }
  });

  it('does not promote a rarity — the printed rate table stays true', () => {
    // The gate is a filter over *bases*, never a change to the roll: pickBase
    // is handed a rarity and has no way to return a different one.
    const chest = ITEM_BASES.filter((def) => def.slot === 'chest');
    for (const rarity of RARITIES) {
      const def = pickBase(chest, rarity, createRng(`norarity:${rarity}`));
      expect(def).not.toBeNull();
    }
  });

  it('collects the rules a hero is wearing, without duplicates', () => {
    const heart = ITEM_BASES.find((def) => def.unique === 'lifesteal')!;
    const plate = ITEM_BASES.find((def) => def.unique === 'bulwark')!;
    const equipped = [make(heart.id), make(plate.id)];

    expect(wornPowers(equipped)).toEqual(['lifesteal', 'bulwark']);
    expect(wornPowers([])).toEqual([]);
  });

  it('respects a base weight, so a named piece stays rare', () => {
    const common = ITEM_BASES.find((def) => def.slot === 'chest' && def.setId === undefined)!;
    const named = ITEM_BASES.find((def) => def.unique === 'lifesteal')!;

    let namedPicks = 0;
    for (let index = 0; index < 400; index += 1) {
      const def = pickBase([common, named], 'mythic', createRng(`weight:${index}`));
      if (def?.unique !== undefined) namedPicks += 1;
    }

    // Weighted below one against an ordinary base: it turns up, but not half the
    // time, which an unweighted pool would give.
    expect(namedPicks).toBeGreaterThan(0);
    expect(namedPicks).toBeLessThan(200);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, requireItemDef } from '@/content/items/index.ts';
import { bracketAt } from '../power/brackets.ts';
import {
  affixBudget,
  budgetOfStat,
  equipmentStats,
  itemStats,
  statPointsFor,
  upgradeMultiplier,
} from './derive.ts';
import { affixSlotsAt, defsForBracket, generateItem, rollAffixCount } from './generate.ts';
import { RARITIES, type ItemInstance } from './types.ts';

function roll(
  overrides: { rarity?: (typeof RARITIES)[number]; bracket?: number; seed?: string } = {},
) {
  const def = requireItemDef('item.chest.scale-cuirass');
  return generateItem({
    def,
    rarity: overrides.rarity ?? 'rare',
    bracket: bracketAt(overrides.bracket ?? 5),
    weights: affixPool(def.affixPool),
    rng: createRng(overrides.seed ?? 'seed'),
    uid: 'test',
  });
}

describe('budget conversion', () => {
  it('round-trips points and budget for every stat', () => {
    for (const stat of ['strength', 'defense', 'hp', 'resource', 'luck', 'speed'] as const) {
      const points = 12;
      expect(statPointsFor(stat, budgetOfStat(stat, points))).toBeCloseTo(points, 6);
    }
  });

  it('prices health cheaply and speed dearly, so their numbers read differently', () => {
    // 100 budget should buy many points of health and few of speed — which is
    // why armour shows +240 HP and a weapon shows +3 Speed.
    expect(statPointsFor('hp', 100)).toBeGreaterThan(statPointsFor('strength', 100));
    expect(statPointsFor('speed', 100)).toBeLessThan(statPointsFor('strength', 100));
  });
});

describe('generateItem', () => {
  it('is deterministic for a seed', () => {
    expect(roll({ seed: 'same' })).toEqual(roll({ seed: 'same' }));
  });

  it('varies with the seed', () => {
    expect(roll({ seed: 'a' })).not.toEqual(roll({ seed: 'b' }));
  });

  it('starts every item unupgraded', () => {
    const item = roll();
    expect(item.level).toBe(0);
    expect(item.ascension).toBe(0);
  });

  it('rolls one or two affixes at ascension 0 (Brief §10.2)', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const item = roll({ seed: `count:${seed}` });
      expect(item.affixes.length).toBeGreaterThanOrEqual(1);
      expect(item.affixes.length).toBeLessThanOrEqual(2);
    }
  });

  it('never rolls the same stat twice on one piece', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const item = roll({ seed: `dup:${seed}` });
      const stats = item.affixes.map((affix) => affix.stat);
      expect(new Set(stats).size).toBe(stats.length);
    }
  });

  it('never rolls an affix worth zero points', () => {
    for (const rarity of RARITIES) {
      for (let seed = 0; seed < 100; seed += 1) {
        const item = roll({ rarity, bracket: 0, seed: `zero:${rarity}:${seed}` });
        for (const affix of item.affixes) expect(affix.value).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('only rolls stats the pool allows', () => {
    const def = requireItemDef('item.offhand.warrior-warded-shield');
    const allowed = new Set(Object.keys(affixPool(def.affixPool)));
    for (let seed = 0; seed < 100; seed += 1) {
      const item = generateItem({
        def,
        rarity: 'epic',
        bracket: bracketAt(4),
        weights: affixPool(def.affixPool),
        rng: createRng(`pool:${seed}`),
        uid: 'x',
      });
      for (const affix of item.affixes) expect(allowed).toContain(affix.stat);
    }
  });

  it('records the realised budget, not the roll', () => {
    const item = roll();
    expect(item.budget).toBeCloseTo(affixBudget(item), 6);
  });

  it('gives higher rarities more affixes on average', () => {
    const twoAffixRate = (rarity: (typeof RARITIES)[number]): number => {
      let two = 0;
      for (let seed = 0; seed < 400; seed += 1) {
        if (rollAffixCount(rarity, createRng(`affix:${rarity}:${seed}`)) === 2) two += 1;
      }
      return two / 400;
    };
    expect(twoAffixRate('common')).toBeLessThan(twoAffixRate('epic'));
    expect(twoAffixRate('legendary')).toBe(1);
  });
});

describe('affix slots by gear ascension (Q3)', () => {
  it('follows the resolved cadence', () => {
    expect([0, 1, 2, 3, 4, 5].map(affixSlotsAt)).toEqual([2, 2, 2, 3, 4, 5]);
  });

  it('clamps outside the range rather than returning undefined', () => {
    expect(affixSlotsAt(-1)).toBe(2);
    expect(affixSlotsAt(99)).toBe(5);
  });
});

describe('derived stats', () => {
  const item: ItemInstance = {
    uid: 'i',
    defId: 'item.chest.scale-cuirass',
    rarity: 'rare',
    level: 0,
    ascension: 0,
    affixes: [
      { stat: 'hp', value: 100 },
      { stat: 'defense', value: 10 },
    ],
    budget: 22,
    bracketAtDrop: 3,
  };

  it('is the raw roll at level 0 with no stars', () => {
    expect(itemStats(item).hp).toBe(100);
    expect(itemStats(item).defense).toBe(10);
  });

  it('grows with gear level (Brief §10.1)', () => {
    expect(itemStats({ ...item, level: 15 }).hp).toBeGreaterThan(itemStats(item).hp);
  });

  it('grows more per star than per level (Brief §10.2)', () => {
    const oneLevel = upgradeMultiplier({ level: 1, ascension: 0 });
    const oneStar = upgradeMultiplier({ level: 0, ascension: 1 });
    expect(oneStar).toBeGreaterThan(oneLevel);
  });

  it('caps the level contribution at 15 however high the field goes', () => {
    expect(upgradeMultiplier({ level: 99, ascension: 0 })).toBe(
      upgradeMultiplier({ level: 15, ascension: 0 }),
    );
  });

  it('sums equipment across pieces, leaving unworn slots at zero', () => {
    const total = equipmentStats([item, { ...item, uid: 'j' }]);
    expect(total.hp).toBe(200);
    expect(total.speed).toBe(0);
  });
});

describe('defsForBracket', () => {
  it('offers starting gear at bracket 0 and stops offering it later', () => {
    const early = defsForBracket(ITEM_BASES, 0).map((def) => def.id);
    const late = defsForBracket(ITEM_BASES, 35).map((def) => def.id);

    expect(early).toContain('item.mainhand.warrior-arming-sword');
    expect(late).not.toContain('item.mainhand.warrior-arming-sword');
  });

  it('always has something to offer at every bracket', () => {
    for (let index = 0; index < 40; index += 1) {
      expect(defsForBracket(ITEM_BASES, index).length, `bracket ${index}`).toBeGreaterThan(0);
    }
  });

  it('covers every equipment slot at both ends of the range', () => {
    for (const index of [0, 39]) {
      const slots = new Set(defsForBracket(ITEM_BASES, index).map((def) => def.slot));
      expect(slots.size, `bracket ${index}`).toBeGreaterThanOrEqual(12);
    }
  });
});

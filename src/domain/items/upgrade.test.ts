import { describe, expect, it } from 'vitest';
import { materialIdForTier } from '@/content/items/materials.ts';
import { itemStats } from './derive.ts';
import {
  affixCapacity,
  ascendGear,
  canAscendGear,
  canLevelUp,
  gearAscensionCost,
  gearLevelCost,
  gearLevelCostToMax,
  hasEmptyAffixSlot,
  levelUp,
  sellValue,
} from './upgrade.ts';
import { GEAR_ASCENSION_MAX, GEAR_LEVEL_MAX, type ItemInstance } from './types.ts';

/** `ascension` is loosened to a plain number so loops can drive it. */
type ItemOverrides = Partial<Omit<ItemInstance, 'ascension'>> & { ascension?: number };

function item(overrides: ItemOverrides = {}): ItemInstance {
  return {
    uid: 'i',
    defId: 'item.chest.scale-cuirass',
    rarity: 'rare',
    level: 0,
    affixes: [
      { stat: 'hp', value: 80 },
      { stat: 'defense', value: 8 },
    ],
    budget: 17.6,
    bracketAtDrop: 4,
    ...overrides,
    ascension: (overrides.ascension ?? 0) as ItemInstance['ascension'],
  };
}

describe('gear level (Brief §10.1)', () => {
  it('caps at 15', () => {
    expect(canLevelUp(item({ level: 14 }))).toBe(true);
    expect(canLevelUp(item({ level: GEAR_LEVEL_MAX }))).toBe(false);
    expect(levelUp(item({ level: GEAR_LEVEL_MAX })).level).toBe(GEAR_LEVEL_MAX);
  });

  it('gets more expensive with every level', () => {
    let previous = 0;
    for (let level = 0; level < GEAR_LEVEL_MAX; level += 1) {
      const cost = gearLevelCost(item({ level }));
      expect(cost, `level ${level} → ${level + 1}`).toBeGreaterThan(previous);
      previous = cost;
    }
  });

  it('turns sharply steeper after level 10 — the wall the brief asks for', () => {
    const earlyStep = gearLevelCost(item({ level: 8 })) / gearLevelCost(item({ level: 7 }));
    const lateStep = gearLevelCost(item({ level: 13 })) / gearLevelCost(item({ level: 12 }));
    expect(lateStep).toBeGreaterThan(earlyStep * 1.5);
  });

  it('keeps levels 1–10 a small fraction of the whole climb to 15', () => {
    // "Levels 1–10: progressively more expensive but cheap" (§10.1). If the
    // first ten cost most of the total, the free-flowing early track is a lie.
    const total = gearLevelCostToMax(item());
    let firstTen = 0;
    for (let level = 0; level < 10; level += 1) firstTen += gearLevelCost(item({ level }));
    expect(firstTen / total).toBeLessThan(0.15);
  });

  it('charges more for rarer gear and for a bigger piece', () => {
    expect(gearLevelCost(item({ rarity: 'mythic' }))).toBeGreaterThan(
      gearLevelCost(item({ rarity: 'common' })),
    );
    // Depth reaches the price through *budget*, not through the bracket index.
    // Charging by both was double-counting the same exponential (BALANCE §9f).
    expect(gearLevelCost(item({ budget: 400 }))).toBeGreaterThan(
      gearLevelCost(item({ budget: 40 })),
    );
  });

  it('prices a piece by what it is worth, not by where it dropped', () => {
    // The M9 fix, asserted directly: two identical pieces cost the same to
    // improve whatever bracket they came from. A second per-bracket multiplier
    // on top of budget made late-game gold meaningless within a few sessions.
    expect(gearLevelCost(item({ bracketAtDrop: 30 }))).toBe(
      gearLevelCost(item({ bracketAtDrop: 1 })),
    );
  });

  it('raises the item’s stats when applied', () => {
    const base = item();
    expect(itemStats(levelUp(base)).hp).toBeGreaterThan(itemStats(base).hp);
  });
});

describe('gear ascension (Brief §10.2)', () => {
  it('caps at five stars', () => {
    expect(canAscendGear(item({ ascension: 4 }))).toBe(true);
    expect(canAscendGear(item({ ascension: GEAR_ASCENSION_MAX }))).toBe(false);
    expect(gearAscensionCost(item({ ascension: 5 }), materialIdForTier)).toBeNull();
    expect(ascendGear(item({ ascension: 5 })).ascension).toBe(5);
  });

  it('does not raise the level cap (§10.2)', () => {
    const ascended = ascendGear(item({ level: GEAR_LEVEL_MAX }));
    expect(canLevelUp(ascended)).toBe(false);
  });

  it('always demands more than one kind of material past the first star', () => {
    for (let stars = 1; stars < GEAR_ASCENSION_MAX; stars += 1) {
      const cost = gearAscensionCost(item({ ascension: stars }), materialIdForTier);
      expect(Object.keys(cost!.materials).length, `star ${stars + 1}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('gets more demanding with every star', () => {
    const totalCount = (stars: number): number =>
      Object.values(
        gearAscensionCost(item({ ascension: stars }), materialIdForTier)!.materials,
      ).reduce((sum, count) => sum + count, 0);
    for (let stars = 1; stars < GEAR_ASCENSION_MAX; stars += 1) {
      expect(totalCount(stars)).toBeGreaterThan(totalCount(stars - 1));
    }
  });

  it('asks deeper items for deeper materials, tying ascension to climbing', () => {
    const shallow = gearAscensionCost(item({ bracketAtDrop: 0 }), materialIdForTier)!;
    const deep = gearAscensionCost(item({ bracketAtDrop: 30 }), materialIdForTier)!;
    expect(Object.keys(shallow.materials)).not.toEqual(Object.keys(deep.materials));
  });

  it('reports the affix slots the next star opens (Q3)', () => {
    expect(gearAscensionCost(item({ ascension: 0 }), materialIdForTier)?.affixSlotsAfter).toBe(2);
    expect(gearAscensionCost(item({ ascension: 2 }), materialIdForTier)?.affixSlotsAfter).toBe(3);
    expect(gearAscensionCost(item({ ascension: 4 }), materialIdForTier)?.affixSlotsAfter).toBe(5);
  });

  it('raises stats by more than a level does', () => {
    const base = item();
    expect(itemStats(ascendGear(base)).hp).toBeGreaterThan(itemStats(levelUp(base)).hp);
  });
});

describe('affix slots', () => {
  it('reports capacity and whether a slot is waiting to be filled', () => {
    const twoAffixItem = item({ ascension: 3 });
    expect(affixCapacity(twoAffixItem)).toBe(3);
    expect(hasEmptyAffixSlot(twoAffixItem)).toBe(true);

    const filled = {
      ...twoAffixItem,
      affixes: [...twoAffixItem.affixes, { stat: 'luck' as const, value: 4 }],
    };
    expect(hasEmptyAffixSlot(filled)).toBe(false);
  });
});

describe('sell value (Q16)', () => {
  it('pays a fraction, never nothing', () => {
    expect(sellValue(item())).toBeGreaterThan(0);
    expect(sellValue(item({ budget: 0.0001 }))).toBeGreaterThanOrEqual(1);
  });

  it('pays more for better and bigger gear', () => {
    expect(sellValue(item({ rarity: 'mythic' }))).toBeGreaterThan(
      sellValue(item({ rarity: 'common' })),
    );
    // Deeper gear sells for more because it *is* worth more: budget carries the
    // depth, so the sale price rides the same anchor as every other price.
    expect(sellValue(item({ budget: 900 }))).toBeGreaterThan(sellValue(item({ budget: 90 })));
  });

  it('pays far less than upgrading the same piece costs', () => {
    // Selling is inventory management, not an income strategy (Brief §14).
    expect(sellValue(item())).toBeLessThan(gearLevelCost(item()));
  });
});

/**
 * The two gear upgrade tracks (Brief §10).
 *
 * **Gear level 0→15** costs gold, and its cost curve is deliberately two-phase:
 * levels 1–10 are cheap enough to spend freely, 11–15 turn steep — "a wall worth
 * pushing, not a paywall" (§10.1). **Gear ascension 0→5 stars** costs materials
 * found in the tower, which is what ties investment to climbing rather than to
 * idling (§10.2).
 *
 * Neither track raises the other's cap: 15 is 15 at every star count (§10.2).
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  GEAR_ASCENSION_COST,
  GEAR_LEVEL_COST,
  GEAR_LEVEL_COST_BY_RARITY,
  SELL_VALUE_FRACTION,
} from '@/content/balance/items.ts';
import { bracketAt } from '../power/brackets.ts';
import { affixSlotsAt } from './generate.ts';
import {
  GEAR_ASCENSION_MAX,
  GEAR_LEVEL_MAX,
  type GearAscension,
  type ItemInstance,
  type MaterialCost,
} from './types.ts';

export function canLevelUp(item: ItemInstance): boolean {
  return item.level < GEAR_LEVEL_MAX;
}

export function canAscendGear(item: ItemInstance): boolean {
  return item.ascension < GEAR_ASCENSION_MAX;
}

/**
 * Gold to take an item from its current level to the next.
 *
 * Scales with the item's bracket so upgrade prices keep pace with income as the
 * player descends, and with rarity so better gear is dearer to improve.
 */
export function gearLevelCost(item: ItemInstance): number {
  if (!canLevelUp(item)) return 0;

  const next = item.level + 1;
  const { early, late, lateStartsAt, bracketFactor } = GEAR_LEVEL_COST;

  const base =
    next <= lateStartsAt
      ? evaluate({ kind: 'polynomial', ...early }, next)
      : late.offsetCost * Math.pow(late.factor, (next - late.offsetLevel) / late.period);

  const bracketScale = Math.pow(bracketFactor, item.bracketAtDrop);
  return Math.round(base * bracketScale * GEAR_LEVEL_COST_BY_RARITY[item.rarity]);
}

/** Total gold from the item's current level all the way to 15. */
export function gearLevelCostToMax(item: ItemInstance): number {
  let total = 0;
  let cursor: ItemInstance = item;
  while (canLevelUp(cursor)) {
    total += gearLevelCost(cursor);
    cursor = { ...cursor, level: cursor.level + 1 };
  }
  return total;
}

export interface AscensionRequirement {
  /** Material ids and counts, resolved against the item's bracket tier. */
  materials: MaterialCost;
  gold: number;
  /** Affix slots the item will have afterwards (Q3 cadence). */
  affixSlotsAfter: number;
}

/**
 * What the next star costs. `materialIdForTier` comes from content, so the
 * requirement resolves to real material ids without this module knowing any.
 */
export function gearAscensionCost(
  item: ItemInstance,
  materialIdForTier: (tier: number) => string,
): AscensionRequirement | null {
  if (!canAscendGear(item)) return null;

  const step = GEAR_ASCENSION_COST[item.ascension];
  if (!step) return null;

  const baseTier = bracketAt(item.bracketAtDrop).materialTier;
  const materials: Record<string, number> = {};
  step.tiers.forEach((offset, index) => {
    const id = materialIdForTier(baseTier + offset);
    materials[id] = (materials[id] ?? 0) + (step.counts[index] ?? 0);
  });

  return {
    materials,
    gold: Math.round(step.gold * Math.pow(GEAR_LEVEL_COST.bracketFactor, item.bracketAtDrop)),
    affixSlotsAfter: affixSlotsAt(item.ascension + 1),
  };
}

/** Raise gear level by one. Callers charge the gold. */
export function levelUp(item: ItemInstance): ItemInstance {
  if (!canLevelUp(item)) return item;
  return { ...item, level: item.level + 1 };
}

/**
 * Add a star, and with it any new affix slots (Q3).
 *
 * A new slot is rolled by the caller with the item's own pool — this function
 * only opens the space, because the roll needs randomness and this does not.
 */
export function ascendGear(item: ItemInstance): ItemInstance {
  if (!canAscendGear(item)) return item;
  return { ...item, ascension: (item.ascension + 1) as GearAscension };
}

/** How many affix slots an item currently has room for. */
export function affixCapacity(item: ItemInstance): number {
  return affixSlotsAt(item.ascension);
}

/** True when ascension has opened a slot the item has not filled yet. */
export function hasEmptyAffixSlot(item: ItemInstance): boolean {
  return item.affixes.length < affixCapacity(item);
}

/** Gold a merchant pays for an unwanted piece (Q16). */
export function sellValue(item: ItemInstance): number {
  const bracketScale = Math.pow(GEAR_LEVEL_COST.bracketFactor, item.bracketAtDrop);
  return Math.max(
    1,
    Math.round(
      item.budget * SELL_VALUE_FRACTION * bracketScale * GEAR_LEVEL_COST_BY_RARITY[item.rarity],
    ),
  );
}

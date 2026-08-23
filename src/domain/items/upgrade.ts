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
import { ITEM_GOLD_PER_BUDGET } from '@/content/balance/merchants.ts';
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
 * What an item is worth in gold — the anchor every price in the game divides by.
 *
 * Budget already grows with the bracket, so this is the *only* place a bracket's
 * exponential enters a price. Multiplying by a second per-bracket factor, as the
 * pre-M9 config did, compounded the same curve twice and made late-game gold
 * meaningless (BALANCE.md §9f).
 */
export function itemGoldValue(item: ItemInstance): number {
  return item.budget * ITEM_GOLD_PER_BUDGET * GEAR_LEVEL_COST_BY_RARITY[item.rarity];
}

/**
 * Gold to take an item from its current level to the next.
 *
 * A multiple of what the piece itself is worth, so an upgrade costs the same
 * *relative* amount at floor 10 and floor 500, and rarity makes better gear
 * dearer to improve.
 */
export function gearLevelCost(item: ItemInstance): number {
  if (!canLevelUp(item)) return 0;

  const next = item.level + 1;
  const { early, late, lateStartsAt } = GEAR_LEVEL_COST;

  const step =
    next <= lateStartsAt
      ? evaluate({ kind: 'polynomial', ...early }, next)
      : late.offsetCost * Math.pow(late.factor, (next - late.offsetLevel) / late.period);

  return Math.max(1, Math.round(itemGoldValue(item) * step));
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
    // Ascension is priced in materials first and gold second; the gold half
    // rides the same anchor as everything else.
    gold: Math.max(1, Math.round(step.goldMultiplier * itemGoldValue(item))),
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
  return Math.max(1, Math.round(itemGoldValue(item) * SELL_VALUE_FRACTION));
}

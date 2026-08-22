/**
 * Turning an item's rolls into the stats it actually gives.
 *
 * Nothing derived here is ever persisted (SAVE_SCHEMA §3): a save stores the
 * rolls, and these formulas run fresh every time. That is what lets a balance
 * patch reach gear players already own without a migration — and what makes the
 * simulator and the game agree by construction.
 */
import {
  GEAR_ASCENSION_STAT_BONUS,
  GEAR_LEVEL_STAT_BONUS_PER_LEVEL,
  STAT_BUDGET_COST,
} from '@/content/balance/items.ts';
import { emptyStatBlock, type StatBlock, type StatId } from '../stats.ts';
import { GEAR_LEVEL_MAX, type ItemInstance } from './types.ts';

/** Budget consumed by `value` points of `stat`. */
export function budgetOfStat(stat: StatId, value: number): number {
  return value * STAT_BUDGET_COST[stat];
}

/** How many points of `stat` a budget buys. */
export function statPointsFor(stat: StatId, budget: number): number {
  return budget / STAT_BUDGET_COST[stat];
}

/** Total budget an item's rolled affixes represent, before upgrades. */
export function affixBudget(item: Pick<ItemInstance, 'affixes'>): number {
  return item.affixes.reduce((total, affix) => total + budgetOfStat(affix.stat, affix.value), 0);
}

/**
 * Multiplier from investment: gear level (Brief §10.1) plus ascension stars
 * (§10.2, which "increases its stats by more than a normal level-up does").
 */
export function upgradeMultiplier(item: Pick<ItemInstance, 'level' | 'ascension'>): number {
  const level = Math.min(GEAR_LEVEL_MAX, Math.max(0, item.level));
  const fromLevels = level * GEAR_LEVEL_STAT_BONUS_PER_LEVEL;
  const fromStars = GEAR_ASCENSION_STAT_BONUS[item.ascension] ?? 0;
  return 1 + fromLevels + fromStars;
}

/** The stats an item contributes when equipped, after its upgrades. */
export function itemStats(item: ItemInstance): StatBlock {
  const multiplier = upgradeMultiplier(item);
  const stats = emptyStatBlock();
  for (const affix of item.affixes) {
    stats[affix.stat] += Math.floor(affix.value * multiplier);
  }
  return stats;
}

/** Combined stats of everything equipped. */
export function equipmentStats(items: readonly ItemInstance[]): StatBlock {
  const total = emptyStatBlock();
  for (const item of items) {
    const stats = itemStats(item);
    for (const stat of Object.keys(total) as StatId[]) total[stat] += stats[stat];
  }
  return total;
}

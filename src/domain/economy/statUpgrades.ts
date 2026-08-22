/**
 * Buying stat points with gold (Brief §6, assumption A2).
 *
 * Unbounded and exponential: there is always another point within reach, and it
 * always costs a little more than the player has — which is how Gold stays "the
 * resource the player is always slightly short of" (Brief §14).
 *
 * **Speed cannot be bought here, and the type system is what enforces it**
 * (Brief §6). `UpgradableStatId` excludes Speed, so there is no way to name it in
 * this module — not a rule someone has to remember, a rule the code cannot break.
 */
import { evaluate } from '@/content/balance/curves.ts';
import { STAT_UPGRADE_COST, STAT_UPGRADE_MULTIPLIER } from '@/content/balance/progression.ts';
import type { GrowableStats, UpgradableStatId } from '../stats.ts';

/** Gold for the next point of `stat`, given how many are already bought. */
export function statUpgradeCost(stat: UpgradableStatId, alreadyPurchased: number): number {
  const base = evaluate(
    { kind: 'exponential', ...STAT_UPGRADE_COST },
    Math.max(0, alreadyPurchased),
  );
  return Math.max(1, Math.round(base * STAT_UPGRADE_MULTIPLIER[stat]));
}

/** Cost of the next point in every stat, for the character screen's rows. */
export function allStatUpgradeCosts(purchased: GrowableStats): Record<UpgradableStatId, number> {
  return {
    strength: statUpgradeCost('strength', purchased.strength),
    defense: statUpgradeCost('defense', purchased.defense),
    hp: statUpgradeCost('hp', purchased.hp),
    resource: statUpgradeCost('resource', purchased.resource),
    luck: statUpgradeCost('luck', purchased.luck),
  };
}

export interface PurchaseResult {
  purchased: GrowableStats;
  goldSpent: number;
  /** Points actually bought — fewer than asked for if the gold ran out. */
  pointsBought: number;
}

/**
 * Buy as many points of `stat` as `gold` covers, up to `points`.
 *
 * Buying several at once charges each point at its own escalating price, so
 * "buy 10" and ten presses of "buy 1" cost exactly the same. A bulk discount
 * hidden in the arithmetic would be a bug nobody reports and everybody exploits.
 */
export function buyStatPoints(
  purchased: GrowableStats,
  stat: UpgradableStatId,
  gold: number,
  points = 1,
): PurchaseResult {
  let owned = purchased[stat];
  let budget = gold;
  let bought = 0;

  for (let index = 0; index < points; index += 1) {
    const cost = statUpgradeCost(stat, owned);
    if (cost > budget) break;
    budget -= cost;
    owned += 1;
    bought += 1;
  }

  return {
    purchased: { ...purchased, [stat]: owned },
    goldSpent: gold - budget,
    pointsBought: bought,
  };
}

/** How many points of `stat` a pile of gold would buy right now. */
export function affordableStatPoints(
  purchased: GrowableStats,
  stat: UpgradableStatId,
  gold: number,
): number {
  return buyStatPoints(purchased, stat, gold, Number.MAX_SAFE_INTEGER).pointsBought;
}

/**
 * Power Level (Brief §13, BALANCE.md §5).
 *
 * A single number for "how strong is this character", combining what they wear,
 * what they have bought, how far they have ascended and how deep they have been.
 * It is displayed to the player because watching it climb is its own reward
 * (Brief §1), and it is the only input to `bracketFor` — so the number the
 * player is proud of is literally the number deciding what the tower gives them.
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  POWER_PER_ASCENSION,
  POWER_STAT_SCALE,
  POWER_TOWER_CURVE,
  POWER_WEIGHTS,
} from '@/content/balance/power.ts';
import { affixBudget, upgradeMultiplier } from '../items/derive.ts';
import type { ItemInstance } from '../items/types.ts';
import type { StatBlock } from '../stats.ts';
import { STAT_IDS } from '../stats.ts';
import { bracketFor, type Bracket } from './brackets.ts';

export interface PowerInputs {
  /** Everything currently equipped (Brief §13: "currently equipped gear"). */
  equipped: readonly ItemInstance[];
  /** Base plus purchased stats, before gear. */
  stats: StatBlock;
  ascension: number;
  highestFloorEverCleared: number;
}

export interface PowerBreakdown {
  gear: number;
  stats: number;
  ascension: number;
  tower: number;
  total: number;
}

/**
 * Gear's contribution: each piece's rolled budget, scaled by what has been
 * invested in it. Using budget rather than raw stat totals keeps a health-heavy
 * piece and a strength-heavy piece worth the same power for the same rarity.
 */
function gearScore(equipped: readonly ItemInstance[]): number {
  return equipped.reduce((total, item) => total + affixBudget(item) * upgradeMultiplier(item), 0);
}

/**
 * One piece's contribution to Power Level, in the units the game prints.
 *
 * This is the same arithmetic `gearScore` does per item, weighted and rounded so
 * the figure means the same thing as the number on the rail: swap a piece that
 * scores 40 for one that scores 58 and the hero's Power Level rises by 18. It
 * exists so "is this better?" has *one* answer everywhere it is asked — the
 * tooltip, the upgrade marker on a bag slot, and the shop row all read it.
 */
export function itemPower(item: ItemInstance): number {
  return Math.round(affixBudget(item) * upgradeMultiplier(item) * POWER_WEIGHTS.gear);
}

function statScore(stats: StatBlock): number {
  const sum = STAT_IDS.reduce((total, stat) => total + stats[stat], 0);
  return sum * POWER_STAT_SCALE;
}

export function powerBreakdown(inputs: PowerInputs): PowerBreakdown {
  const gear = gearScore(inputs.equipped) * POWER_WEIGHTS.gear;
  const stats = statScore(inputs.stats) * POWER_WEIGHTS.stats;
  const ascension = inputs.ascension * POWER_PER_ASCENSION * POWER_WEIGHTS.ascension;
  const tower =
    evaluate(POWER_TOWER_CURVE, Math.max(0, inputs.highestFloorEverCleared)) * POWER_WEIGHTS.tower;

  return {
    gear,
    stats,
    ascension,
    tower,
    total: Math.round(gear + stats + ascension + tower),
  };
}

export function powerLevel(inputs: PowerInputs): number {
  return powerBreakdown(inputs).total;
}

/** The bracket this character draws items from — the only path any source takes. */
export function bracketForCharacter(inputs: PowerInputs): Bracket {
  return bracketFor(powerLevel(inputs));
}

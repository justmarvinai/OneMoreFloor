/**
 * Item balance — brackets, rarity, affixes and gear upgrade costs.
 *
 * **This file is where the brief's anti-overshoot rule actually lives** (§13).
 * The bracket table below decides how strong an item *can* be at a given Power
 * Level; rarity only decides where inside that range it lands. No item source
 * gets to widen the range, which is why "a Level 12 hero on Floor 21 finds a
 * +1000 Strength chestplate" is not a bug we guard against but an item that
 * cannot be constructed.
 *
 * Every number here is provisional and tuned in M9 against the simulator
 * (BALANCE.md §10).
 */
import type { Rarity } from '@/domain/items/types.ts';
import type { StatId } from '@/domain/stats.ts';

/**
 * Reference stat budget by bracket. A bracket is a band of Power Level; the
 * budget is the total "stat points" an item of that band is worth before rarity
 * decides its position in the window.
 *
 * Growth is exponential so the curve stays meaningful at floor 10, floor 500 and
 * floor 5000 (Brief §3.7). Bracket 0 is the starting band.
 */
export const BRACKET_COUNT = 40;

/** Power Level at which each bracket begins. Bracket 0 starts at 0. */
export const BRACKET_POWER_STEP = { base: 60, factor: 1.55, period: 1 } as const;

/** Reference budget for bracket 0, growing by `BUDGET_FACTOR` per bracket. */
export const BRACKET_BASE_BUDGET = 26;
export const BRACKET_BUDGET_FACTOR = 1.42;

/**
 * The window an item's budget may occupy, as multiples of the bracket's
 * reference budget. The spread is what gives rarity room to matter: a mythic at
 * the top of a bracket is worth roughly four times a common at the bottom, and
 * both are still that bracket's items.
 */
export const BUDGET_WINDOW = { min: 0.55, max: 2.4 } as const;

/**
 * Where each rarity sits inside the window, as a fraction of it. Ranges overlap
 * slightly so a lucky rare can edge out an unlucky epic — the texture that makes
 * comparing two drops interesting rather than arithmetic.
 */
export const RARITY_WINDOW_POSITION: Readonly<Record<Rarity, { min: number; max: number }>> = {
  common: { min: 0.0, max: 0.12 },
  uncommon: { min: 0.1, max: 0.28 },
  rare: { min: 0.25, max: 0.48 },
  epic: { min: 0.45, max: 0.7 },
  legendary: { min: 0.68, max: 0.9 },
  mythic: { min: 0.88, max: 1.0 },
};

/**
 * Affix counts at gear ascension 0, by rarity (Brief §10.2: "1 or 2, 2 is the
 * maximum"). Higher rarities are likelier to roll the second slot.
 */
export const RARITY_SECOND_AFFIX_CHANCE: Readonly<Record<Rarity, number>> = {
  common: 0.15,
  uncommon: 0.35,
  rare: 0.6,
  epic: 0.85,
  legendary: 1.0,
  mythic: 1.0,
};

/**
 * Affix slots by gear ascension (Brief §10.2 as resolved by Q3). Index is the
 * ascension tier; tier 0 is handled by the rarity roll above, capped at 2.
 */
export const AFFIX_SLOTS_BY_ASCENSION: readonly number[] = [2, 2, 2, 3, 4, 5];

/**
 * What one point of each stat costs from an item's budget. Health is cheap per
 * point, so armour shows big HP numbers; Speed is expensive, because it is the
 * gear-only stat and the scarcest thing on any piece (Brief §6).
 */
export const STAT_BUDGET_COST: Readonly<Record<StatId, number>> = {
  strength: 1,
  defense: 1,
  // Health is the cheapest stat per point, so armour shows big satisfying
  // numbers — but not so cheap that one common shield doubles a level-1 hero's
  // health pool, which is where this started before it was tuned down.
  hp: 0.25,
  resource: 0.85,
  luck: 1.15,
  speed: 2.6,
};

/**
 * Multiplier on an item's affix values from gear level (Brief §10.1). Level 15
 * is worth about +60% over level 0 — a real reason to push, not a second item.
 */
export const GEAR_LEVEL_STAT_BONUS_PER_LEVEL = 0.04;

/**
 * Multiplier from gear ascension stars (Brief §10.2: "increases its stats by more
 * than a normal level-up does"), plus the extra affix slots above.
 */
export const GEAR_ASCENSION_STAT_BONUS: readonly number[] = [0, 0.08, 0.18, 0.3, 0.44, 0.6];

/**
 * Gold cost to take a piece from `level` to `level + 1` (Brief §10.1).
 *
 * Levels 1–10 are a gentle polynomial the player upgrades freely; 11–15 turn
 * sharply exponential — the "worth pushing" wall, priced to stay reachable
 * rather than to feel like a toll gate.
 */
export const GEAR_LEVEL_COST = {
  /** Scales with the item's bracket, so upgrades keep pace with income. */
  bracketFactor: 1.38,
  early: { base: 40, coefficient: 26, exponent: 1.7 },
  late: { base: 40, factor: 2.35, period: 1, offsetLevel: 10, offsetCost: 3_400 },
  lateStartsAt: 10,
} as const;

/** Rarity multiplier on upgrade costs: better gear is dearer to improve. */
export const GEAR_LEVEL_COST_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 0.7,
  uncommon: 0.85,
  rare: 1,
  epic: 1.3,
  legendary: 1.7,
  mythic: 2.2,
};

/**
 * Materials to take a piece from `stars` to `stars + 1` (Brief §10.2: "multiple
 * different materials found in the tower"). Counts rise per star, and deeper
 * stars demand higher-tier materials — which ties gear ascension to *climbing*
 * rather than to grinding one floor.
 */
export const GEAR_ASCENSION_COST: readonly {
  /** Material tiers required, relative to the item's bracket tier. */
  tiers: readonly number[];
  /** How many of each. */
  counts: readonly number[];
  gold: number;
}[] = [
  { tiers: [0], counts: [4], gold: 200 },
  { tiers: [0, 1], counts: [8, 3], gold: 900 },
  { tiers: [0, 1], counts: [14, 8], gold: 3_200 },
  { tiers: [1, 2], counts: [18, 10], gold: 11_000 },
  { tiers: [1, 2], counts: [26, 16], gold: 38_000 },
];

/**
 * Fraction of an item's worth recovered by selling it to a merchant (Q16). Low
 * enough that selling is inventory management rather than an income strategy —
 * Gold must stay the thing the player is always slightly short of (Brief §14).
 */
export const SELL_VALUE_FRACTION = 0.18;

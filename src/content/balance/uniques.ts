/**
 * What a unique's power is worth, and what a set bonus gives (Q45).
 *
 * The ids and the flavour live in `content/items/uniques.ts` and
 * `content/items/sets.ts`; the magnitudes live here, the way the procedural
 * modifiers' strength does (§3.7). Tuning a unique is then a one-line edit in a
 * file of numbers rather than a hunt through prose.
 */
import type { Rarity } from '@/domain/items/types.ts';

/**
 * How strong each unique power is.
 *
 * All five are deliberately in the same band — a unique is *different*, not
 * bigger, and one that made another unique pointless would collapse the choice
 * back into a single best answer.
 */
export const UNIQUE_MAGNITUDE = {
  /** Fraction the resource bar fills faster. */
  swiftCharge: 0.32,
  /** Fraction of damage dealt returned as health. */
  lifesteal: 0.09,
  /** Fraction of incoming damage turned aside, always. */
  bulwark: 0.12,
  /** Extra multiplier on a critical hit, on top of the ordinary one. */
  deadlyCrits: 0.45,
  /** Fraction of damage taken sent back to whoever dealt it. */
  thorns: 0.18,
} as const;

/**
 * What a unique adds to Power Level.
 *
 * A power is not a stat, so it contributes nothing through the stat path — and a
 * piece whose whole value is invisible to the bracket would let a hero carry
 * five of them and still draw drops sized for someone weaker (§13). This is the
 * number that keeps the bracket honest.
 */
export const UNIQUE_POWER_LEVEL = 220;

/**
 * The rarity a unique needs the roll to reach before it may appear.
 *
 * Uniques do **not** force a rarity: the rate table printed in the summoning
 * lobby is about rarity, and a unique that promoted a rare drop to legendary
 * would quietly make those numbers false. Instead they simply are not in the
 * pool until the roll has already come up this high, which makes them the top
 * of the ladder without moving a single printed figure.
 */
export const UNIQUE_MIN_RARITY: Rarity = 'legendary';

/**
 * Relative likelihood of a unique base against an ordinary one, once the rarity
 * gate is passed. Low: the point of a named piece is that you remember finding
 * it.
 */
export const UNIQUE_BASE_WEIGHT = 0.5;

/** Relative likelihood of a set piece against an ordinary base in its slot. */
export const SET_BASE_WEIGHT = 0.42;

/** How many pieces each set bonus asks for, shallowest first. */
export const SET_THRESHOLDS: readonly number[] = [2, 4, 6];

/**
 * What each threshold gives, as a fraction of the stat it raises.
 *
 * They compound: a six-piece hero has all three, because a set that traded its
 * early bonuses for its last one would punish the hero for finishing it.
 */
export const SET_BONUS_MAGNITUDE: readonly number[] = [0.1, 0.17, 0.26];

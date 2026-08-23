/**
 * Account-upgrade tables (Brief §15).
 *
 * Exactly two upgrades exist and no more (§15 is explicit about it). Both are
 * priced here rather than in the screen that sells them (§3.7).
 *
 * The prices are provisional handles for M9's tuning, but their *shape* is a
 * design decision and is not: Battle Speed's cost is concentrated at the top
 * (Q19 — x8 is the long-term goal §15.1 asks for, not a quality-of-life
 * purchase), and the first extra character slot is cheap while the rest are not
 * (§15.2 — trying a second class should be an easy yes).
 */
import type { BattleSpeedTier } from '@/domain/character/types.ts';

/**
 * Playback multipliers by tier (Brief §3.5, shaped by Q19). Tier 0 is what every
 * account starts with; the upgrade walks it up to x8, and §15.1 requires that
 * walk to be long and expensive.
 */
export const BATTLE_SPEED_BY_TIER: Readonly<Record<BattleSpeedTier, number>> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
};

/** Every tier in order, for a UI that shows what is bought and what is not. */
export const BATTLE_SPEED_TIERS: readonly BattleSpeedTier[] = [0, 1, 2, 3];

/**
 * Gold to *reach* each tier. Tier 0 is free — it is where every account starts.
 * The jump to x8 is the "insanely expensive" one (§15.1, Q19).
 */
export const BATTLE_SPEED_PRICE: Readonly<Record<BattleSpeedTier, number>> = {
  0: 0,
  1: 30_000,
  2: 600_000,
  3: 12_000_000,
};

/**
 * Gold to unlock each character slot, indexed by slot number. Slot 1 is free.
 *
 * Slot 2 is about a first session's income — genuinely cheap, as §15.2 asks. The
 * second hero is how a player meets the other four classes, and pricing that at
 * "a few evenings" costs the game more than it earns. Everything above it is
 * expensive, per the same line.
 */
export const ACCOUNT_SLOT_PRICE: readonly number[] = [0, 0, 900, 120_000, 900_000, 6_000_000];

/** Five slots is the maximum the brief allows (§15.2). */
export const MAX_ACCOUNT_SLOTS = 5;

/**
 * Backpack size, and what widening it costs.
 *
 * A third account upgrade, added by the owner in the fifth polish round — §15
 * said "exactly two, do not add more", and this supersedes that line for the
 * backpack only (USER_QUESTIONS Q30). It is priced like the other two: the first
 * step is close to free, and the last one is a goal.
 *
 * Sold in steps of five so a purchase is a visible row of new sockets rather
 * than one more square.
 */
export const STARTING_BACKPACK_SLOTS = 20;
export const MAX_BACKPACK_SLOTS = 50;
export const BACKPACK_SLOT_STEP = 5;

/**
 * Gold to reach each backpack size, keyed by the size it buys. Sizes not listed
 * cannot be bought — which is what makes 50 the ceiling rather than a check.
 */
export const BACKPACK_SLOT_PRICE: Readonly<Record<number, number>> = {
  25: 2_500,
  30: 30_000,
  35: 180_000,
  40: 900_000,
  45: 3_500_000,
  50: 14_000_000,
};

/**
 * What finishing the tutorial pays (Brief §18: "1 Lucky Ticket + starting
 * Gold"). The gold is sized to cover a first stat point and a cheap piece from
 * the Equipment Merchant, so the tour ends with something to *do* rather than a
 * number in a bar.
 *
 * Skipping forfeits it. That is the "gentle discouragement" §18 asks for —
 * a nudge that says what is being given up beats a nag that says nothing.
 */
export const TUTORIAL_REWARD = { gold: 500, luckyTickets: 1 } as const;

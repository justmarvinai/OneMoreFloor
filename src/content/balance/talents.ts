/**
 * Talents (Q38) — the hero's own build, priced and bounded.
 *
 * A hero's power comes from three places the player does not choose: what the
 * tower drops, what gold buys, and what the account has already earned. Talents
 * are the fourth, and the only one that is a *decision* — the same class, the
 * same level, the same gear, played two different ways.
 *
 * Everything here is a shape rather than a magic number, and the shapes carry
 * the design:
 *
 * - **Points come from levels**, one each, so the reward for a level-up is a
 *   choice rather than a number quietly going up.
 * - **Deep ranks cost more points than shallow ones**, so a finished tree is a
 *   long climb rather than a formality, and so specialising early is genuinely
 *   different from spreading thin.
 * - **Tiers open on points spent**, not on prerequisites between nodes. A tree
 *   that gates node C behind node B is only a longer way of saying "buy B".
 *
 * Nothing here can raise Speed: the talent effect type is built on
 * `UpgradableStatId`, which excludes it by construction (Brief §6).
 */
import type { Curve } from './curves.ts';

/** Talent points a hero earns per level, from level 1 (Q38). */
export const TALENT_POINTS_PER_LEVEL = 1;

/** Ranks any single talent can hold. */
export const TALENT_MAX_RANK = 5;

/**
 * What one rank costs, by the tier the talent sits in.
 *
 * The deepest tier costs five points a rank, so its two capstones are what a
 * player spends a long stretch of the game working towards rather than
 * something picked up in passing.
 */
export const TALENT_RANK_COST: readonly number[] = [1, 2, 3, 5];

/**
 * Points that must already be spent in the tree before a tier opens.
 *
 * Chosen so each gate lands roughly where the tier below it is half-filled: a
 * player is always one or two levels from something new, never staring at three
 * locked rows.
 */
export const TALENT_TIER_UNLOCK: readonly number[] = [0, 12, 30, 60];

/**
 * Gold to unlearn everything (Q38).
 *
 * Priced off *points spent*, not level: what a respec undoes is the investment,
 * and a hero who has spent four points should be able to change their mind for
 * pocket money.
 *
 * The rate is deliberately `FLOOR_GOLD`'s own — ×1.72 per ten. Points come one
 * per level, and M9 tuned levels to track depth, so a cost growing at the rate
 * floors pay stays worth about the same two floors of climbing at every point on
 * the curve. A flat fee would be a real decision for an hour and free forever
 * after; a steeper one would make the tree a cage at exactly the depth where a
 * player has learnt enough to want to rebuild it.
 */
export const TALENT_RESPEC_COST: Curve = {
  kind: 'exponential',
  base: 55,
  factor: 1.72,
  period: 10,
};

/**
 * What one rank of each effect is worth.
 *
 * Percentages are fractions of one. `statPercent` is a share of the hero's
 * durable total for that stat — a percentage rather than a flat value, because a
 * flat one would be enormous at level 5 and invisible at level 500.
 */
export const TALENT_MAGNITUDE = {
  /** Per rank, added to the named stat as a fraction of its durable total. */
  statPercent: 0.03,
  /** Per rank, added to signature-move damage. */
  signature: 0.06,
  /** Per rank, added to how fast the resource bar fills. */
  resourceFill: 0.05,
  /** Per rank, added to the extra damage a critical hit deals. */
  critDamage: 0.09,
  /** Per rank, turned aside from every incoming blow. */
  damageReduction: 0.022,
  /** Per rank, added to the chance a strike lands twice. */
  doubleStrike: 0.018,
  /** Per rank, added to the gold a floor pays. */
  gold: 0.05,
  /** Per rank, added to the experience a floor teaches. */
  xp: 0.05,
  /** Per rank, added to the materials a floor gives up. */
  materials: 0.06,
  /** Per rank, healed at the end of a round, as a fraction of the hero's pool. */
  regeneration: 0.012,
} as const;

/**
 * Ceilings the tree can never argue with.
 *
 * Two of the effects above sit on top of numbers the combat model keeps inside a
 * tuned window on purpose (COMBAT.md §2): mitigation must never reach immunity,
 * and a double-strike chance must never reach certainty. A talent that could
 * walk either to its limit would not make a build stronger — it would make the
 * band-relative design stop working. These are hard clamps, applied after
 * everything else.
 */
export const TALENT_CAP = {
  damageReduction: 0.3,
  doubleStrike: 0.2,
} as const;

/**
 * Power Level per point spent on a talent that grants no stat (Q38, Brief §13).
 *
 * A talent that raises Strength is already visible to the bracket, because the
 * bracket reads the hero's stat total. A talent that makes crits hurt more is
 * not — and a hero who has poured sixty points into rules the bracket cannot see
 * would draw drops sized for someone far weaker. This is what keeps §13 honest
 * about them, and it is deliberately counted *only* for the invisible ones, so
 * nothing is paid for twice.
 */
export const POWER_PER_TALENT_POINT = 26;

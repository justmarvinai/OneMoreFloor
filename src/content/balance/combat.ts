/**
 * Combat balance (COMBAT.md, BALANCE.md §4).
 *
 * Every number a fight depends on lives here. The shapes matter more than the
 * values: percentages are **band-relative**, so raw stats inflate forever while
 * crit chance and double-attack chance stay inside tuned windows at floor 10 and
 * floor 5000 alike (Brief §3.7).
 *
 * M9 note: the three reference curves below grow at **exactly the rate stats
 * grow** (×1.9 per ten floors, the enemy power curve). They used to grow at
 * ×1.42, which is slower — so mitigation, crit and double-attack all drifted
 * upward with depth and would have pinned at their caps a few hundred floors in,
 * which is the precise failure the band-relative design exists to prevent.
 */

/** Damage a strike deals before defense, as a multiple of Strength. */
export const STRIKE_STRENGTH_COEFFICIENT = 1;

/** Every strike varies within this band, so no two fights read identically. */
export const DAMAGE_VARIANCE = { min: 0.9, max: 1.1 } as const;

/**
 * Defense mitigation: `taken = dealt × K / (K + DEF)`. `K` grows with the floor
 * band, which is what keeps a fixed Defense value from becoming immunity twenty
 * floors later — and what stops it ever reaching immunity at all.
 */
export const DEFENSE_K = { base: 60, factor: 1.9, period: 10 } as const;

/** Crit (Brief §4.2: "Luck determines crit rate"). Band-relative, hard-capped. */
export const CRIT = {
  /** Luck equal to this fraction of the band's reference yields half the cap. */
  reference: { base: 40, factor: 1.9, period: 10 },
  cap: 0.6,
  multiplier: 2,
} as const;

/** Speed's double-attack chance (Brief §4.2/§6). Gear is its only source. */
export const SPEED = {
  reference: { base: 26, factor: 1.9, period: 10 },
  cap: 0.5,
} as const;

/**
 * Signature moves (Q6/Q26). A full resource bar spends itself on one, and the
 * pool size scales the payoff — a bigger pool charges slower and hits harder.
 */
export const SIGNATURE = {
  /** Damage multiplier at the reference pool size, per class archetype. */
  berserkStrike: 3.4,
  shieldSlam: 2.6,
  /** Shield Slam's damage reduction, and how long it lasts. */
  shieldSlamReduction: 0.3,
  shieldSlamRounds: 2,
  arcaneBlast: 3.1,
  /** Fraction of the enemy's Defense that Arcane Blast ignores. */
  arcaneBlastPierce: 0.45,
  piercingVolleyHits: 4,
  piercingVolleyPerHit: 0.85,
  crescendo: 1.9,
  /** Crescendo's song buff, and how long it plays. */
  crescendoBuff: 0.25,
  crescendoRounds: 3,
  flurryHits: 3,
  flurryPerHit: 1.05,
  /**
   * How much the resource pool scales a signature. At the reference pool the
   * multiplier is 1; a pool twice that size hits appreciably harder.
   */
  poolReference: 14,
  poolScaling: 0.45,
} as const;

/** Resource gained per event, as a fraction of the unit's pool (Q26). */
export const RESOURCE_FILL = {
  /** Warrior: rage from giving and taking punishment. */
  warriorOnDealHit: 0.16,
  warriorOnTakeHit: 0.14,
  /** Mage: a steady per-round clock. */
  magePerRound: 0.22,
  /** Hunter: on hit, with a bonus for crits. */
  hunterOnDealHit: 0.18,
  hunterOnCrit: 0.14,
  /** Bard: per round, faster while a song is playing. */
  bardPerRound: 0.22,
  bardPerRoundBuffed: 0.33,
  /**
   * Swashbuckler: on dodges and double attacks (Q26) — plus a small per-round
   * trickle. Without it the class is unplayable at level 1: both of its fill
   * events depend on Speed, and Speed comes only from gear (Brief §6), so a new
   * Swashbuckler could never charge Focus at all. The balance simulator found
   * this on its first run.
   */
  swashOnDodge: 0.3,
  swashOnDoubleAttack: 0.22,
  swashPerRound: 0.16,
  /** Enemies with a kit charge on a simple per-round clock. */
  enemyPerRound: 0.14,
} as const;

/**
 * A fight that cannot end has to end somewhere (COMBAT.md §3). This should
 * effectively never fire — the simulator's job in M9 is to prove it does not.
 */
export const ROUND_CAP = 100;

/**
 * Power Level weights (Brief §13, BALANCE.md §5).
 *
 * One number standing for the character's total strength, and the sole input to
 * every item source's bracket. Weights decide what "getting stronger" means:
 * gear dominates, because gear is what the player is choosing between; the
 * others keep a naked level-800 hero from being treated as a beginner.
 */

export const POWER_WEIGHTS = {
  /** Equipped gear, including its levels and stars. */
  gear: 1,
  /** Base and purchased stats (Brief §13). */
  stats: 0.9,
  /** Hero ascension tier — a structural jump, not an incremental one. */
  ascension: 0.6,
  /** Highest floor ever cleared: where the player has actually been. */
  tower: 0.75,
} as const;

/** Power contributed per hero-ascension tier. */
export const POWER_PER_ASCENSION = 220;

/**
 * Tower contribution by highest floor cleared. Sub-linear, so a deep run raises
 * the bracket without letting one lucky climb outrun the gear that survived it.
 */
export const POWER_TOWER_CURVE = { base: 0, coefficient: 9, exponent: 0.92 } as const;

/** Scale applied to the summed stat block before weighting. */
export const POWER_STAT_SCALE = 0.55;

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
 * Tower contribution by highest floor cleared — **the term that decides which
 * bracket a character draws from** (M9).
 *
 * It is exponential at exactly the enemy power curve's rate, and that is the
 * whole design. Gear cannot lift its own bracket (see `BRACKET_POWER_STEP`), so
 * what raises it is *depth*: the tower gives you gear sized to where you have
 * actually been. Matching the enemy rate makes the gap between what the tower
 * offers and what it fields a **constant number of brackets at every depth** —
 * the "meaningful at floor 10, floor 500 and floor 5000" property (Brief §3.7)
 * expressed as arithmetic rather than hoped for. Levels, stat points and gear
 * upgrades are the margin that closes that constant gap, which is why gold is
 * always the thing you are short of (§14).
 *
 * `base` places the whole ladder: raising it moves the first death wall deeper,
 * lowering it brings the wall closer. It is the single knob for *where* the
 * tower first pushes back.
 *
 * `factor` is deliberately a shade *below* the enemy curve's ×1.9. Matched
 * exactly, the fight would be identical on every floor and nothing would ever
 * stop a player — an endless tower with no wall is a screensaver. A whisker
 * behind means the tower pulls a few percent ahead every ten floors, the gap
 * compounds into a wall, and levels, stat points and gear upgrades are what push
 * that wall back. That is the loop the whole economy exists to feed (§14).
 */
export const POWER_TOWER_CURVE = {
  kind: 'exponential',
  base: 60,
  factor: 1.9,
  period: 10,
} as const;

/** Scale applied to the summed stat block before weighting. */
export const POWER_STAT_SCALE = 0.55;

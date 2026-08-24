/**
 * Enemy and floor scaling (Brief §3.7).
 *
 * "Enemy stats, enemy variety and rewards must scale smoothly and endlessly with
 * floor number… The curve must remain meaningful at floor 10, floor 500 and
 * floor 5000." That is this file: one exponential per stat, plus the multipliers
 * that make a boss floor a wall rather than a slightly taller stair.
 */

/** Enemy power by floor. ~×1.9 per ten floors, forever (BALANCE.md §3). */
export const ENEMY_POWER = { base: 1, factor: 1.9, period: 10 } as const;

/** Enemy stats at floor 1, before the power curve and the profile multipliers. */
export const ENEMY_BASE = {
  strength: 9,
  defense: 6,
  hp: 95,
  resource: 8,
  luck: 5,
  speed: 3,
} as const;

/**
 * Boss floors (Brief §3.2): "higher difficulty than the surrounding normal
 * floors", with extra rewards and a buff/debuff kit on top.
 */
export const BOSS_MULTIPLIER = {
  strength: 1.35,
  defense: 1.4,
  hp: 2.6,
  resource: 1.5,
  luck: 1.2,
  speed: 1.15,
} as const;

/**
 * How much of a boss's *excess* over a normal floor is actually applied, by
 * depth (M9).
 *
 * The multipliers above are what a boss is worth at full strength. Applying them
 * from floor 10 made the very first gate the wall for almost every simulated
 * hero — the M9 measurement put the median first death at floor 10 with the
 * ninetieth percentile there too, against §10's 15–25 target. A fresh hero has
 * barely any gear at the first gate, so a 2.6× health pool is a cliff rather
 * than a step.
 *
 * So the excess ramps in: the first gate is a lesson, floor 60 onwards is the
 * full wall. This scales only the part *above* a normal floor, so a boss is
 * never weaker than the floor below it.
 */
export const BOSS_RAMP = { fromFloor: 10, toFloor: 60, start: 0.04 } as const;

/** How hard a boss's own kit hits, growing slowly with depth. */
export const BOSS_KIT_SCALING = { base: 1, factor: 1.18, period: 50 } as const;

/**
 * Procedural modifiers past the hand-authored range. A modifier trades one stat
 * for another, so a "Frenzied" enemy is a different fight rather than a bigger
 * one (CONTENT_PIPELINE §2).
 */
export const MODIFIER_STRENGTH = 0.3;

/** Chance a normal floor's enemy carries a modifier, once past the authored band. */
export const MODIFIER_CHANCE = 0.35;

/**
 * Curses (fifth polish round) — enemy affixes the *player* switches on.
 *
 * The procedural modifiers above trade one stat for another, which is what makes
 * a deep floor varied rather than merely bigger. A curse does the opposite on
 * purpose: it only ever raises, so choosing one is choosing a harder tower, and
 * the tower pays for it. That trade is the whole feature, so both halves are
 * numbers here rather than shapes in content.
 *
 * A curse that raises three or more stats is the broad one: it costs more per
 * fight than any single-stat curse and pays more than any of them, which is what
 * keeps it a real choice rather than a strictly-worse bundle.
 */
export const CURSE_STAT_BONUS = 0.4;
export const CURSE_BROAD_STAT_BONUS = 0.18;
export const CURSE_REWARD_BONUS = 0.28;
export const CURSE_BROAD_REWARD_BONUS = 0.45;

/**
 * Hero level that opens them (owner's instruction, fifth polish round).
 *
 * Late, and deliberately: a curse is a choice a player makes about a tower they
 * already understand, and offering it at level 5 would just be a difficulty
 * setting with a reward attached.
 */
export const CURSE_UNLOCK_LEVEL = 100;

/** How many can run at once. Three, so the choice stays a choice. */
export const MAX_ACTIVE_CURSES = 3;

/** What one curse is worth, given how many stats it touches. */
export function curseMagnitude(statCount: number): { stat: number; reward: number } {
  return statCount >= 3
    ? { stat: CURSE_BROAD_STAT_BONUS, reward: CURSE_BROAD_REWARD_BONUS }
    : { stat: CURSE_STAT_BONUS, reward: CURSE_REWARD_BONUS };
}

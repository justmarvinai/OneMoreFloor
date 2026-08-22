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

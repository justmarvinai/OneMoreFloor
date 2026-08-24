/**
 * Companions (Q42) — how strong a pet is, how it grows, and what it costs.
 *
 * A companion is the only thing in the game that fights *beside* the hero, so
 * every number here answers the same question: how much of the fight belongs to
 * the pet? Too little and it is a decoration with a health bar; too much and the
 * hero is watching their own combat.
 *
 * The answer the shapes encode: a companion is a **fraction of the hero**. Its
 * stats are read off theirs rather than rolled, which means one never needs gear,
 * never needs a bracket of its own, and never goes obsolete twenty floors after
 * it is found — the three ways a pet system usually dies.
 */
import type { Curve } from './curves.ts';

/** Ranks a companion can reach. Finite: a species is a thing you finish. */
export const PET_MAX_LEVEL = 50;

/**
 * How much of the hero a companion is worth at level 1, and at the ceiling.
 *
 * Interpolated linearly between the two, so the growth a player sees per level
 * is constant and legible — a curve here would make "is my Emberling worth
 * levelling?" a question nobody can answer by looking.
 */
export const PET_SCALE = { atLevelOne: 0.34, atMaxLevel: 1.0 } as const;

/**
 * Experience a floor gives the companion that fought on it.
 *
 * Only the active one earns: choosing a companion should be a commitment, and a
 * roster that all levels at once is a roster with no choice in it.
 */
export const PET_XP_PER_FLOOR: Curve = {
  kind: 'exponential',
  base: 9,
  factor: 1.66,
  period: 10,
};

/** Experience to go from `level` to `level + 1`. */
export const PET_XP_TO_NEXT: Curve = {
  kind: 'exponential',
  base: 120,
  factor: 1.66,
  period: 10,
};

/**
 * What a companion's aura is worth, per rank of its level.
 *
 * Auras are the reason to switch companions rather than simply to field the
 * strongest one: the numbers are close enough that which *stat* it raises
 * matters more than how much.
 */
export const PET_AURA = {
  /** Per level, added to the stat the species raises, as a share of the total. */
  statScale: 0.004,
  /** Per level, turned aside from every blow that reaches the hero. */
  damageReduction: 0.0022,
  /** Nothing a companion does may walk mitigation towards immunity. */
  damageReductionCap: 0.16,
} as const;

/**
 * How often the enemy goes for the companion instead of the hero.
 *
 * Per species, in its own definition — a guardian draws far more than a harrier
 * does — but never all of it: a companion that could hold the enemy's attention
 * completely would turn every fight into the pet's fight.
 */
export const PET_TAUNT_CAP = 0.55;

/**
 * Power Level per companion level (Brief §13).
 *
 * A companion is real power that the hero's own stats know nothing about — it
 * has its own health bar and takes its own turn — so the bracket has to see it,
 * or a player fielding a maxed Cinder Hound draws drops sized for someone
 * fighting alone.
 */
export const POWER_PER_PET_LEVEL = 34;

/** Floors that free each species, in the order the tower gives them up. */
export const PET_UNLOCK_FLOORS: readonly number[] = [5, 20, 45, 90, 160, 260];

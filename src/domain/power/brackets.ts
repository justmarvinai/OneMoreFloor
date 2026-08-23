/**
 * Power-Level brackets — the anti-overshoot mechanism (Brief §13, BALANCE.md §6).
 *
 * The brief's rule, restated precisely: **rarity decides how good an item is
 * within a bracket; Power Level decides the bracket.** So the guarantee is not
 * "each source refuses to hand out absurd items" — it is that an absurd item has
 * no representation at that bracket at all. Drops, both merchants and the gacha
 * call the same `bracketFor`, which is why none of them can drift.
 *
 * Upgrades are deliberately outside this rule: an item the player has spent gold
 * and materials on *should* exceed its drop budget. That investment also raises
 * Power Level, which raises the bracket, which raises the next drop. The loop
 * closes on itself.
 */
import {
  BRACKET_BASE_BUDGET,
  BRACKET_BUDGET_FACTOR,
  BRACKET_COUNT,
  BRACKET_POWER_STEP,
  BUDGET_WINDOW,
  RARITY_WINDOW_POSITION,
} from '@/content/balance/items.ts';
import { lerp } from '@/content/balance/curves.ts';
import type { Rarity } from '../items/types.ts';

export interface Bracket {
  /** Bracket index, 0 upwards. */
  index: number;
  /** Lowest Power Level in this bracket. */
  minPower: number;
  /** Reference stat budget for items of this bracket. */
  referenceBudget: number;
  /** The only budgets an item generated at this bracket may have. */
  window: { min: number; max: number };
  /** Material tier this depth yields (Brief §10.2). */
  materialTier: number;
}

/** Power Level at which a bracket starts. Bracket 0 starts at 0. */
export function bracketMinPower(index: number): number {
  if (index <= 0) return 0;
  const { base, factor, period } = BRACKET_POWER_STEP;
  return Math.round(base * Math.pow(factor, (index - 1) / period));
}

function referenceBudget(index: number): number {
  return BRACKET_BASE_BUDGET * Math.pow(BRACKET_BUDGET_FACTOR, index);
}

export function bracketAt(index: number): Bracket {
  const clamped = Math.max(0, Math.min(BRACKET_COUNT - 1, Math.floor(index)));
  const reference = referenceBudget(clamped);
  return {
    index: clamped,
    minPower: bracketMinPower(clamped),
    referenceBudget: reference,
    window: {
      min: reference * BUDGET_WINDOW.min,
      max: reference * BUDGET_WINDOW.max,
    },
    // Material tiers advance more slowly than brackets, so a tier stays relevant
    // for several brackets rather than obsoleting every few floors.
    materialTier: Math.floor(clamped / 5),
  };
}

/**
 * The bracket a character of this Power Level draws from. **Every item source
 * must route through here** — that single fact is what makes the anti-overshoot
 * property testable once rather than per source.
 */
export function bracketFor(powerLevel: number): Bracket {
  if (!Number.isFinite(powerLevel) || powerLevel < BRACKET_POWER_STEP.base) return bracketAt(0);

  // Closed form rather than a scan: the ladder is two hundred brackets long and
  // this is called on every drop, every shelf and every pull.
  const { base, factor, period } = BRACKET_POWER_STEP;
  const steps = Math.log(powerLevel / base) / Math.log(factor);
  return bracketAt(1 + Math.floor(steps * period));
}

/**
 * The budget range a given rarity may occupy inside a bracket. Ranges overlap
 * between neighbouring rarities, so a lucky rare can beat an unlucky epic —
 * which is what makes comparing two drops a decision rather than a lookup.
 */
export function budgetRangeFor(bracket: Bracket, rarity: Rarity): { min: number; max: number } {
  const position = RARITY_WINDOW_POSITION[rarity];
  return {
    min: lerp(bracket.window.min, bracket.window.max, position.min),
    max: lerp(bracket.window.min, bracket.window.max, position.max),
  };
}

/** True when a budget is legal for this bracket, whatever produced it. */
export function isWithinBracket(bracket: Bracket, budget: number): boolean {
  // A hair of tolerance for floating-point drift; the window is a design
  // boundary, not a bit-exact one.
  const epsilon = 1e-6;
  return budget >= bracket.window.min - epsilon && budget <= bracket.window.max + epsilon;
}

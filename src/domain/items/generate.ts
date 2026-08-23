/**
 * Item generation — the single door every item in the game comes through.
 *
 * Floor drops, both merchants and the gacha all call `generateItem`. That is a
 * deliberate structural choice: the anti-overshoot rule (Brief §13) is then one
 * property of one function, testable once and impossible for a later source to
 * quietly opt out of.
 *
 * The order matters and follows BALANCE.md §6:
 *   bracket → rarity → budget inside that rarity's slice of the window →
 *   affix count → distribute the budget across affixes.
 */
import {
  AFFIX_SLOTS_BY_ASCENSION,
  RARITY_SECOND_AFFIX_CHANCE,
  STAT_BUDGET_COST,
} from '@/content/balance/items.ts';
import type { Rng } from '@/app/rng.ts';
import { budgetRangeFor, type Bracket } from '../power/brackets.ts';
import type { StatId } from '../stats.ts';
import { budgetOfStat, statPointsFor } from './derive.ts';
import type { Affix, AffixPoolId, ItemDef, ItemInstance, Rarity } from './types.ts';

/**
 * Which stats a pool may roll, and how likely each is. Weights shape an item's
 * character: armour leans defensive, a bow leans toward the Luck that a Hunter
 * turns into damage, and Speed appears only on gear because it appears *nowhere
 * else* (Brief §6).
 */
export type AffixWeights = Readonly<Partial<Record<StatId, number>>>;

export interface GenerateItemInput {
  def: ItemDef;
  rarity: Rarity;
  bracket: Bracket;
  /** The pool's stat weights, from content. */
  weights: AffixWeights;
  rng: Rng;
  /** Instance id; callers pass a stable one so generation stays replayable. */
  uid: string;
}

/**
 * How many affixes a freshly generated item rolls (Brief §10.2: at gear
 * ascension 0 an item has "1 or 2 (2 is the maximum)").
 */
export function rollAffixCount(rarity: Rarity, rng: Rng): number {
  return rng.chance(RARITY_SECOND_AFFIX_CHANCE[rarity]) ? 2 : 1;
}

/** Affix slots available once a piece has been ascended (Q3 cadence). */
export function affixSlotsAt(ascension: number): number {
  return AFFIX_SLOTS_BY_ASCENSION[Math.max(0, Math.min(5, ascension))] ?? 2;
}

/**
 * Split a budget across `count` affixes. The first affix takes the largest
 * share, so an item reads as "a Strength piece with a bit of health" rather than
 * a flat spread of nothing in particular.
 */
function splitBudget(budget: number, count: number, rng: Rng): number[] {
  if (count <= 1) return [budget];

  const shares: number[] = [];
  let remaining = budget;
  for (let index = 0; index < count - 1; index += 1) {
    // Each affix takes 45–70% of what is left, leaving a decreasing tail.
    const share = remaining * rng.range(0.45, 0.7);
    shares.push(share);
    remaining -= share;
  }
  shares.push(remaining);
  return shares;
}

function pickStats(weights: AffixWeights, count: number, rng: Rng): StatId[] {
  const entries = Object.entries(weights)
    .filter((entry): entry is [StatId, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .map(([stat, weight]) => ({ value: stat, weight }));

  if (entries.length === 0) throw new Error('affix pool has no weighted stats');

  const chosen: StatId[] = [];
  const available = [...entries];
  for (let index = 0; index < count && available.length > 0; index += 1) {
    const stat = rng.weighted(available);
    chosen.push(stat);
    // No duplicate stats on one piece: two separate +Strength lines read as a
    // bug even when the total is right.
    const position = available.findIndex((entry) => entry.value === stat);
    available.splice(position, 1);
  }
  return chosen;
}

/**
 * Trim affixes until what the item actually *gives* fits under the bracket
 * ceiling.
 *
 * Rolling a budget inside the window is not enough on its own: affix values are
 * whole numbers, and rounding up — plus the one-point floor below — can push the
 * realised total past the ceiling. Without this step the anti-overshoot test
 * would be checking the roll rather than the item, which is exactly the kind of
 * guarantee that looks green and means nothing.
 */
function fitUnderCeiling(affixes: Affix[], ceiling: number): Affix[] {
  const trimmed = affixes.map((affix) => ({ ...affix }));

  for (let guard = 0; guard < 1000; guard += 1) {
    const realised = trimmed.reduce(
      (total, affix) => total + budgetOfStat(affix.stat, affix.value),
      0,
    );
    if (realised <= ceiling) break;

    // Take the point off whichever affix costs the most budget per point, so a
    // single expensive stat gives ground before several cheap ones do.
    const reducible = trimmed.filter((affix) => affix.value > 1);
    if (reducible.length === 0) break;
    const dearest = reducible.reduce((worst, affix) =>
      STAT_BUDGET_COST[affix.stat] > STAT_BUDGET_COST[worst.stat] ? affix : worst,
    );
    dearest.value -= 1;
  }

  return trimmed;
}

/**
 * Generate an item for a bracket.
 *
 * What the item actually gives is always at or under the bracket's ceiling — the
 * invariant the permanent property test asserts, and the whole of Brief §13.
 */
export function generateItem(input: GenerateItemInput): ItemInstance {
  const { def, rarity, bracket, weights, rng, uid } = input;

  const range = budgetRangeFor(bracket, rarity);
  const rolled = rng.range(range.min, range.max);

  const count = Math.min(rollAffixCount(rarity, rng), Object.keys(weights).length);
  const stats = pickStats(weights, count, rng);
  const shares = splitBudget(rolled, stats.length, rng);

  const affixes = fitUnderCeiling(
    stats.map((stat, index) => ({
      stat,
      // At least one point: an affix that rounds to zero is a line of text
      // promising something the item does not do.
      value: Math.max(1, Math.round(statPointsFor(stat, shares[index] ?? 0))),
    })),
    bracket.window.max,
  );

  return {
    uid,
    defId: def.id,
    rarity,
    level: 0,
    ascension: 0,
    affixes,
    // The realised budget, not the roll: this is the number that audits the
    // anti-overshoot rule against a real save (SAVE_SCHEMA §3).
    budget: affixes.reduce((total, affix) => total + budgetOfStat(affix.stat, affix.value), 0),
    bracketAtDrop: bracket.index,
  };
}

/**
 * Roll the affix a gear ascension's new slot gets (Brief §10.2, Q3).
 *
 * Deliberately *not* held to the drop bracket: an ascended piece has cost gold
 * and materials the tower only yields deeper down, and the whole point of the
 * investment is that it beats what drops. Brackets constrain what the game
 * *hands out*, never what the player *builds* (BALANCE.md §6).
 *
 * The new line is worth the average of what the piece already carries, so
 * ascending a strong item stays proportionally strong and ascending a weak one
 * does not quietly turn it into a good one.
 */
export function rollAscensionAffix(
  item: Pick<ItemInstance, 'affixes' | 'budget'>,
  weights: AffixWeights,
  rng: Rng,
): Affix | null {
  const taken = new Set(item.affixes.map((affix) => affix.stat));
  const available = Object.entries(weights)
    .filter((entry): entry is [StatId, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .filter(([stat]) => !taken.has(stat))
    .map(([stat, weight]) => ({ value: stat, weight }));

  // Every stat in the pool is already on the piece: nothing left to add, and a
  // duplicate line would read as a bug.
  if (available.length === 0) return null;

  const share = item.affixes.length > 0 ? item.budget / item.affixes.length : item.budget;
  const stat = rng.weighted(available);
  return { stat, value: Math.max(1, Math.round(statPointsFor(stat, share))) };
}

/** Base types eligible at a bracket, so a rusty dagger stops dropping on floor 400. */
/**
 * The item bases a bracket may roll.
 *
 * A base's bracket range says *when it looks right* — a rusted shortsword stops
 * dropping once the player is past it. Past the deepest authored range there is
 * nothing left to look right, and returning an empty pool would mean a bracket
 * that drops no gear at all. So the deepest tier stays open-ended: the ladder is
 * unbounded (`BRACKET_COUNT`), the art is not, and the art repeats rather than
 * the tower going bare (M9).
 */
export function defsForBracket(defs: readonly ItemDef[], bracketIndex: number): ItemDef[] {
  const inRange = defs.filter(
    (def) => bracketIndex >= def.brackets[0] && bracketIndex <= def.brackets[1],
  );
  if (inRange.length > 0) return inRange;

  const deepest = defs.reduce((top, def) => Math.max(top, def.brackets[1]), -Infinity);
  return defs.filter((def) => def.brackets[1] === deepest);
}

export type { AffixPoolId };

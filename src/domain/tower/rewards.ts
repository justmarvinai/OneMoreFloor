/**
 * Floor rewards (Brief §3.6, BALANCE.md §7).
 *
 * "Clearing a floor rewards a mix of: currency, crafting/upgrade materials,
 * equipment, relics, artifacts… Boss floors reward more." Two rules govern this:
 *
 *  - **Every item goes through the bracket** (Brief §13). This module calls the
 *    same generator merchants and the gacha will, so the anti-overshoot property
 *    covers floor drops for free.
 *  - **Relics and artifacts are gated** (Q22): they only drop once the character
 *    has ascended far enough to wear them, so no reward is dead loot.
 */
import type { Rng } from '@/app/rng.ts';
import { evaluate } from '@/content/balance/curves.ts';
import {
  BOSS_EQUIPMENT_DROP_CHANCE,
  BOSS_EQUIPMENT_SECOND_CHANCE,
  BOSS_LUCKY_TICKET_DROP_CHANCE,
  BOSS_MATERIAL_COUNT,
  BOSS_MATERIAL_DROP_CHANCE,
  BOSS_REWARD_MULTIPLIER,
  BOSS_TICKET_DROP_CHANCE,
  EQUIPMENT_DROP_CHANCE,
  FLOOR_GOLD,
  FLOOR_XP,
  LUCKY_TICKET_DROP_CHANCE,
  MATERIAL_COUNT,
  MATERIAL_DROP_CHANCE,
  RARITY_WEIGHTS,
  REWARD_VARIANCE,
  TICKET_DROP_CHANCE,
  ELITE_MATERIAL_COUNT,
  ELITE_REWARD_MULTIPLIER,
} from '@/content/balance/rewards.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, materialIdForTier } from '@/content/items/index.ts';
import { unlockedSlotsAt } from '../character/character.ts';
import type { AscensionTier } from '../character/types.ts';
import { defsForBracket, generateItem, pickBase } from '../items/generate.ts';
import { RARITIES, type ItemInstance, type Rarity } from '../items/types.ts';
import type { Bracket } from '../power/brackets.ts';
import { curseRewardMultiplier } from './curses.ts';

export interface FloorReward {
  gold: number;
  xp: number;
  /** Material id → count. */
  materials: Record<string, number>;
  items: ItemInstance[];
  tickets: number;
  luckyTickets: number;
}

export interface RollRewardInput {
  floor: number;
  isBoss: boolean;
  bracket: Bracket;
  /** The hero's class, so only usable weapons drop. */
  classId: string;
  /** Ascension tier, which gates relic and artifact drops (Q22). */
  ascension: AscensionTier;
  /** An elite floor pays more, and always pays gear (Q44). */
  isElite?: boolean;
  /**
   * Curses the player has taken (Q35). They multiply gold, experience and
   * materials — never the bracket, so §13 holds with a full set of them on.
   */
  curses?: readonly string[];
  rng: Rng;
}

/** Rarity table for a bracket — deeper bands unlock the better tiers (§9.2). */
export function rarityWeightsFor(bracketIndex: number): Array<{ value: Rarity; weight: number }> {
  let table = RARITY_WEIGHTS[0]!;
  for (const entry of RARITY_WEIGHTS) {
    if (bracketIndex >= entry.fromBracket) table = entry;
  }
  return RARITIES.map((rarity) => ({ value: rarity, weight: table.weights[rarity] ?? 0 }));
}

/**
 * Which slots a drop may target. Relic and artifact appear only once their slot
 * is unlocked, so the tower never hands out something unusable (Q22).
 */
function droppableSlots(ascension: AscensionTier): Set<string> {
  const unlocked = new Set<string>(unlockedSlotsAt(ascension));
  return new Set([
    'helmet',
    'chest',
    'leggings',
    'boots',
    'gauntlets',
    'cape',
    'wrists',
    'mainhand',
    'offhand',
    ...unlocked,
  ]);
}

/** What a floor is worth, before luck touches it — for the pre-fight preview. */
export interface FloorRewardEstimate {
  /** Gold at the middle of the variance band. */
  gold: number;
  /** XP at the middle of the variance band. */
  xp: number;
  /** Chance the floor drops a piece of equipment at all, 0–1. */
  itemChance: number;
}

/**
 * The same curves `rollFloorReward` uses, with the dice left out.
 *
 * A player deciding whether a boss is worth the walk wants a figure, and the
 * only honest figure before the roll is its middle: the variance band is
 * symmetrical (§ balance/rewards), so the midpoint *is* the expectation. It
 * lives here rather than in the screen so the preview can never drift from what
 * the floor actually pays — one curve, two callers.
 */
export function floorRewardEstimate(
  floor: number,
  isBoss: boolean,
  curses: readonly string[] = [],
  isElite = false,
): FloorRewardEstimate {
  const multiplier =
    (isBoss ? BOSS_REWARD_MULTIPLIER : isElite ? ELITE_REWARD_MULTIPLIER : 1) *
    curseRewardMultiplier(curses);
  return {
    gold: Math.max(
      1,
      Math.round(evaluate({ kind: 'exponential', ...FLOOR_GOLD }, floor) * multiplier),
    ),
    xp: Math.max(1, Math.round(evaluate({ kind: 'exponential', ...FLOOR_XP }, floor) * multiplier)),
    itemChance: isBoss ? BOSS_EQUIPMENT_DROP_CHANCE : isElite ? 1 : EQUIPMENT_DROP_CHANCE,
  };
}

export function rollFloorReward(input: RollRewardInput): FloorReward {
  const { floor, isBoss, bracket, rng } = input;
  // A cursed tower pays more for the same floor. Applied to the payout rather
  // than to the curve so the curve keeps meaning "what floor N is worth".
  const curses = curseRewardMultiplier(input.curses ?? []);
  const elite = input.isElite === true;
  const multiplier =
    (isBoss ? BOSS_REWARD_MULTIPLIER : elite ? ELITE_REWARD_MULTIPLIER : 1) * curses;

  const gold = Math.max(
    1,
    Math.round(
      evaluate({ kind: 'exponential', ...FLOOR_GOLD }, floor) *
        multiplier *
        rng.range(REWARD_VARIANCE.min, REWARD_VARIANCE.max),
    ),
  );
  const xp = Math.max(
    1,
    Math.round(
      evaluate({ kind: 'exponential', ...FLOOR_XP }, floor) *
        multiplier *
        rng.range(REWARD_VARIANCE.min, REWARD_VARIANCE.max),
    ),
  );

  const materials: Record<string, number> = {};
  // An elite always pays materials, like a boss: the point of one is that it is
  // worth stopping for, and a maybe is not.
  const materialChance = isBoss || elite ? BOSS_MATERIAL_DROP_CHANCE : MATERIAL_DROP_CHANCE;
  if (rng.chance(materialChance)) {
    const range = isBoss ? BOSS_MATERIAL_COUNT : elite ? ELITE_MATERIAL_COUNT : MATERIAL_COUNT;
    const id = materialIdForTier(bracket.materialTier);
    materials[id] = Math.max(1, Math.round(rng.int(range.min, range.max) * curses));
  }

  const items: ItemInstance[] = [];
  // Gear is the whole reason to want an elite, so it is a certainty rather than
  // a good chance — the surprise is meeting one, not what it leaves behind.
  const dropChance = isBoss ? BOSS_EQUIPMENT_DROP_CHANCE : elite ? 1 : EQUIPMENT_DROP_CHANCE;
  if (rng.chance(dropChance)) {
    const item = rollItem(input);
    if (item) items.push(item);
    // A boss is the one place gear arrives in quantity — sometimes two pieces,
    // which is most of what the tower gives a player to choose between now.
    if (isBoss && item && rng.chance(BOSS_EQUIPMENT_SECOND_CHANCE)) {
      const second = rollItem(input);
      if (second) items.push(second);
    }
  }

  const ticketChance = isBoss ? BOSS_TICKET_DROP_CHANCE : TICKET_DROP_CHANCE;
  const luckyChance = isBoss ? BOSS_LUCKY_TICKET_DROP_CHANCE : LUCKY_TICKET_DROP_CHANCE;

  return {
    gold,
    xp,
    materials,
    items,
    tickets: rng.chance(ticketChance) ? 1 : 0,
    luckyTickets: rng.chance(luckyChance) ? 1 : 0,
  };
}

/** Roll one piece of equipment for this character, or nothing if none fits. */
export function rollItem(input: RollRewardInput): ItemInstance | null {
  const { bracket, classId, ascension, rng, floor } = input;

  const slots = droppableSlots(ascension);
  const candidates = defsForBracket(ITEM_BASES, bracket.index).filter(
    (def) => slots.has(def.slot) && (def.classId === null || def.classId === classId),
  );
  if (candidates.length === 0) return null;

  // Rarity first, because the unique gate reads it: a named piece is not in the
  // pool until the roll has already come up legendary or better (Q45).
  const rarity = rng.weighted(rarityWeightsFor(bracket.index));
  const def = pickBase(candidates, rarity, rng);
  if (!def) return null;

  // The one door every item comes through (Brief §13, BALANCE.md §6).
  return generateItem({
    def,
    rarity,
    bracket,
    weights: affixPool(def.affixPool),
    rng: rng.fork(`item:${def.id}`),
    uid: `drop-${floor}-${def.id}-${rarity}`,
  });
}

/** Fold a reward into a running total, for Quick-Raid's aggregate summary (Q8). */
export function mergeRewards(a: FloorReward, b: FloorReward): FloorReward {
  const materials = { ...a.materials };
  for (const [id, count] of Object.entries(b.materials)) {
    materials[id] = (materials[id] ?? 0) + count;
  }
  return {
    gold: a.gold + b.gold,
    xp: a.xp + b.xp,
    materials,
    items: [...a.items, ...b.items],
    tickets: a.tickets + b.tickets,
    luckyTickets: a.luckyTickets + b.luckyTickets,
  };
}

export function emptyReward(): FloorReward {
  return { gold: 0, xp: 0, materials: {}, items: [], tickets: 0, luckyTickets: 0 };
}

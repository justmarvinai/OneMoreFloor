/**
 * Daily and weekly quests (Brief §17, Q10, Q21).
 *
 * Three rules do the work here:
 *
 *  - **A period is a date string, not a timer.** `2026-08-22` and `2026-W34`
 *    are what the board is keyed by, so "did this day already happen?" is a
 *    string comparison rather than arithmetic on a clock a player can move
 *    (Q10, SAVE_SCHEMA §7).
 *  - **A board only ever moves forward.** A period key that is not *later* than
 *    the stored one leaves the board alone, so winding the clock back re-opens
 *    nothing. The clock service already damps rollback; this is the second lock
 *    on the same door, and the cheap one.
 *  - **Targets follow the player down.** A template is a recipe, not a quest:
 *    it is instantiated each period against the hero's own bracket, which is
 *    what keeps §17's "one day of normal play" true at every depth.
 */
import { createRng, type Rng } from '@/app/rng.ts';
import { evaluate } from '@/content/balance/curves.ts';
import { FLOOR_GOLD, FLOOR_XP } from '@/content/balance/rewards.ts';
import {
  QUEST_BOARD,
  QUEST_MATERIAL_COUNT,
  QUEST_MIN_DEPTH_TARGET,
  QUEST_REFERENCE_FLOOR_MIN,
  QUEST_REWARD_FLOORS,
  QUEST_TICKET_CHANCE,
} from '@/content/balance/quests.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import { questTemplate, templatesFor } from '@/content/quests/index.ts';
import type { QuestCadence, QuestTemplate } from '@/content/quests/types.ts';
import type { FloorReward } from '../tower/rewards.ts';
import type { QuestBoard, QuestEvent, QuestState, QuestsState } from './types.ts';

export type { QuestBoard, QuestEvent, QuestState, QuestsState };

export interface QuestContext {
  /** The bracket the hero is in, which scales both targets and payouts. */
  bracketIndex: number;
  /** Material tier this depth yields, for the payout's material component. */
  materialTier: number;
  /** Depth the payout is priced against — their best floor, never below the floor. */
  referenceFloor: number;
  /** Seed root, so a board is reproducible from the save alone. */
  seed: string;
}

/** An empty board for a period nobody has played yet. */
export function emptyQuests(): QuestsState {
  return { daily: { periodKey: '', quests: [] }, weekly: { periodKey: '', quests: [] } };
}

/**
 * Bring both boards up to date.
 *
 * Returns the same object when nothing moved, so callers can skip a save on the
 * overwhelmingly common "still the same day" path.
 */
export function refreshBoards(
  quests: QuestsState,
  keys: { dayKey: string; weekKey: string },
  context: QuestContext,
): QuestsState {
  const daily = refreshBoard(quests.daily, 'daily', keys.dayKey, context);
  const weekly = refreshBoard(quests.weekly, 'weekly', keys.weekKey, context);
  if (daily === quests.daily && weekly === quests.weekly) return quests;
  return { daily, weekly };
}

function refreshBoard(
  board: QuestBoard,
  cadence: QuestCadence,
  periodKey: string,
  context: QuestContext,
): QuestBoard {
  // Not later than what is stored: the same period, or a clock that went
  // backwards. Either way the board stands (Q10).
  if (periodKey <= board.periodKey) return board;
  return rollBoard(cadence, periodKey, context);
}

/** Build a period's board. Deterministic in the seed and the period key. */
export function rollBoard(
  cadence: QuestCadence,
  periodKey: string,
  context: QuestContext,
): QuestBoard {
  const rng = createRng(`${context.seed}/quests:${cadence}:${periodKey}`);
  const picked = pickTemplates(cadence, rng);
  return {
    periodKey,
    quests: picked.map((template) => instantiate(template, context, rng)),
  };
}

/**
 * Choose the period's templates: three of each, and — for weeklies — exactly one
 * hard one, which is the slot §17 lets pay in tickets (Q21).
 */
function pickTemplates(cadence: QuestCadence, rng: Rng): QuestTemplate[] {
  if (cadence === 'daily') {
    return sample(templatesFor('daily'), QUEST_BOARD.daily, rng);
  }
  const hard = sample(templatesFor('weekly', 'hard'), QUEST_BOARD.hardWeeklies, rng);
  const normal = sample(
    templatesFor('weekly', 'normal'),
    QUEST_BOARD.weekly - QUEST_BOARD.hardWeeklies,
    rng,
  );
  return [...hard, ...normal];
}

function sample<T>(pool: readonly T[], count: number, rng: Rng): T[] {
  const remaining = [...pool];
  const chosen: T[] = [];
  while (chosen.length < count && remaining.length > 0) {
    const index = rng.int(0, remaining.length - 1);
    chosen.push(remaining[index]!);
    remaining.splice(index, 1);
  }
  return chosen;
}

function instantiate(template: QuestTemplate, context: QuestContext, rng: Rng): QuestState {
  return {
    templateId: template.id,
    target: targetFor(template, context),
    progress: 0,
    claimed: false,
    reward: rollReward(template, context, rng.fork(`reward:${template.id}`)),
  };
}

/**
 * What this period asks for, in the template's own unit.
 *
 * Gold targets are priced against the floor the hero actually earns on, not
 * against their bracket. Those two come apart badly early: a level-2 hero in
 * their starting gear can sit three brackets up while still earning floor-4
 * money, and a bracket-priced weekly would ask them for a fortune they have no
 * way to make.
 */
function targetFor(template: QuestTemplate, context: QuestContext): number {
  const floor = Math.max(QUEST_REFERENCE_FLOOR_MIN, context.referenceFloor);

  switch (template.unit) {
    case 'count':
      return Math.max(1, Math.round(template.base));
    case 'goldFloors':
      return Math.max(
        1,
        Math.round(evaluate({ kind: 'exponential', ...FLOOR_GOLD }, floor) * template.base),
      );
    case 'depth':
      return Math.max(QUEST_MIN_DEPTH_TARGET, Math.round(floor * template.base));
  }
}

/**
 * What a quest pays, priced as a multiple of what a floor at this depth pays.
 * Anchoring to the floor curve is what keeps a daily worth chasing forever
 * instead of becoming pocket change by floor 200 (BALANCE.md §9).
 */
function rollReward(template: QuestTemplate, context: QuestContext, rng: Rng): FloorReward {
  const floor = Math.max(QUEST_REFERENCE_FLOOR_MIN, context.referenceFloor);
  const floors =
    template.difficulty === 'hard'
      ? QUEST_REWARD_FLOORS.hard
      : QUEST_REWARD_FLOORS[template.cadence];

  const gold = Math.round(evaluate({ kind: 'exponential', ...FLOOR_GOLD }, floor) * floors);
  const xp = Math.round(evaluate({ kind: 'exponential', ...FLOOR_XP }, floor) * floors);

  const range = QUEST_MATERIAL_COUNT[template.cadence];
  const materials: Record<string, number> = {
    [materialIdForTier(context.materialTier)]: rng.int(range.min, range.max),
  };

  // Only hard quests carry ticket odds, and they are rolled here so the board
  // can show what a quest pays before the player commits to it (§17).
  const hard = template.difficulty === 'hard';
  return {
    gold,
    xp,
    materials,
    items: [],
    tickets: hard && rng.chance(QUEST_TICKET_CHANCE.hard) ? 1 : 0,
    luckyTickets: hard && rng.chance(QUEST_TICKET_CHANCE.hardLucky) ? 1 : 0,
  };
}

/** Advance whatever the event moves, on both boards. */
export function recordEvent(quests: QuestsState, event: QuestEvent): QuestsState {
  const daily = advanceBoard(quests.daily, event);
  const weekly = advanceBoard(quests.weekly, event);
  if (daily === quests.daily && weekly === quests.weekly) return quests;
  return { daily, weekly };
}

function advanceBoard(board: QuestBoard, event: QuestEvent): QuestBoard {
  let changed = false;
  const quests = board.quests.map((quest) => {
    if (quest.claimed) return quest;
    const template = questTemplate(quest.templateId);
    if (!template) return quest;

    const next = advance(quest, template, event);
    if (next === quest) return quest;
    changed = true;
    return next;
  });
  return changed ? { ...board, quests } : board;
}

function advance(quest: QuestState, template: QuestTemplate, event: QuestEvent): QuestState {
  const gain = contribution(template, event);
  if (gain === 0) return quest;

  // `reachFloor` is a high-water mark, not a tally: reaching floor 40 twice is
  // not reaching floor 80.
  const progress =
    template.objective === 'reachFloor'
      ? Math.max(quest.progress, gain)
      : Math.min(quest.target, quest.progress + gain);

  return progress === quest.progress ? quest : { ...quest, progress };
}

function contribution(template: QuestTemplate, event: QuestEvent): number {
  switch (template.objective) {
    case 'clearFloors':
      return event.kind === 'floorCleared' ? 1 : 0;
    case 'defeatBosses':
      return event.kind === 'floorCleared' && event.isBoss ? 1 : 0;
    case 'reachFloor':
      return event.kind === 'floorCleared' ? event.floor : 0;
    case 'earnGold':
      return event.kind === 'goldEarned' ? event.amount : 0;
    case 'spendGold':
      return event.kind === 'goldSpent' ? event.amount : 0;
    case 'upgradeGear':
      return event.kind === 'gearUpgraded' ? 1 : 0;
    case 'buyItems':
      return event.kind === 'itemBought' ? 1 : 0;
    case 'sellItems':
      return event.kind === 'itemSold' ? 1 : 0;
    case 'drinkPotions':
      return event.kind === 'potionDrunk' ? 1 : 0;
  }
}

export function isComplete(quest: QuestState): boolean {
  return quest.progress >= quest.target;
}

export function isClaimable(quest: QuestState): boolean {
  return isComplete(quest) && !quest.claimed;
}

/** Mark a quest claimed. The caller banks the reward through `grantReward`. */
export function markClaimed(
  quests: QuestsState,
  cadence: QuestCadence,
  index: number,
): QuestsState {
  const board = quests[cadence];
  const quest = board.quests[index];
  if (!quest || !isClaimable(quest)) return quests;

  const next = board.quests.map((entry, at) =>
    at === index ? { ...entry, claimed: true } : entry,
  );
  return { ...quests, [cadence]: { ...board, quests: next } };
}

/** Anything on either board waiting to be collected — the §20.5 dot's source. */
export function claimableCount(quests: QuestsState): number {
  return [...quests.daily.quests, ...quests.weekly.quests].filter(isClaimable).length;
}

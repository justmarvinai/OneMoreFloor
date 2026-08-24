/**
 * Expeditions (Q37) — sending a party out, and what they bring home.
 *
 * The one thing this file is really about is the exchange rate between time you
 * are not playing and time you are. A tower-climber whose best move is to close
 * the tab has stopped being one, so an expedition is priced in floors: an hour
 * away is worth a handful of them at the depth the hero has reached, and a
 * player actually climbing clears many times that in the same hour.
 *
 * Everything here is per-account and keyed by character slot, which is what lets
 * a party keep working while its slot's hero is not the one being played — and
 * what makes the §15 character-slot upgrade worth something to a player with no
 * interest in a second hero.
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  EXPEDITIONS_PER_SLOT,
  EXPEDITION_DEPTH_SHARE,
  EXPEDITION_FLOORS_PER_HOUR,
  EXPEDITION_MATERIALS_PER_HOUR,
  EXPEDITION_TICKET_CHANCE_PER_HOUR,
} from '@/content/balance/expeditions.ts';
import { FLOOR_GOLD, FLOOR_XP } from '@/content/balance/rewards.ts';
import { MAX_CHARACTER_SLOTS } from '@/content/balance/progression.ts';
import {
  EXPEDITIONS,
  expeditionsFor,
  getExpedition,
  type ExpeditionDef,
} from '@/content/expeditions/index.ts';
import { materialIdForTier } from '@/content/items/index.ts';
import type { Rng } from '@/app/rng.ts';
import type { Account, ExpeditionState } from '../character/types.ts';
import type { Bracket } from '../power/brackets.ts';
import { emptyReward, type FloorReward } from '../tower/rewards.ts';

export { EXPEDITIONS, expeditionsFor, getExpedition };
export type { ExpeditionDef };

const HOUR_MS = 60 * 60 * 1000;

/** How long a route takes, in milliseconds. */
export function durationOf(def: ExpeditionDef): number {
  return Math.round(def.hours * HOUR_MS);
}

/**
 * How many parties the account can have out at once.
 *
 * One per character slot opened, and the first slot is free — so a brand-new
 * account can send one before it has bought anything, and a player who buys
 * slots gets dispatch capacity whether or not they ever make a second hero.
 */
export function partyCount(account: Pick<Account, 'slotsUnlocked'>): number {
  const slots = Math.max(1, Math.min(MAX_CHARACTER_SLOTS, Math.floor(account.slotsUnlocked)));
  return slots * EXPEDITIONS_PER_SLOT;
}

/** Every party slot the account has, whether or not anything is in it. */
export function partySlots(account: Pick<Account, 'slotsUnlocked'>): number[] {
  return Array.from({ length: partyCount(account) }, (_, index) => index + 1);
}

/** What is running in one slot, or null when the party is waiting for orders. */
export function runningIn(
  account: Pick<Account, 'expeditions'>,
  slot: number,
): ExpeditionState | null {
  return account.expeditions[String(slot)] ?? null;
}

/** True once the clock has passed the return time. */
export function isBack(state: ExpeditionState, now: number): boolean {
  return now >= state.endsAt;
}

/** Milliseconds until the party is due, floored at zero. */
export function remainingMs(state: ExpeditionState, now: number): number {
  return Math.max(0, state.endsAt - now);
}

/** Everything one party slot's card needs, without the screen doing arithmetic. */
export interface PartyStatus {
  slot: number;
  /** Null when nothing is out. */
  state: ExpeditionState | null;
  /** The route that is running, when the id still resolves. */
  def: ExpeditionDef | null;
  back: boolean;
  remainingMs: number;
}

export function parties(
  account: Pick<Account, 'slotsUnlocked' | 'expeditions'>,
  now: number,
): PartyStatus[] {
  return partySlots(account).map((slot) => {
    const state = runningIn(account, slot);
    // A route a future build removed leaves a party out with nothing to come
    // back with; the card can still show the timer and let it be recalled.
    const def = state ? (getExpedition(state.id) ?? null) : null;
    return {
      slot,
      state,
      def,
      back: state ? isBack(state, now) : false,
      remainingMs: state ? remainingMs(state, now) : 0,
    };
  });
}

export type SendRefusal = 'noSuchExpedition' | 'noSuchSlot' | 'slotBusy' | 'tooDeep';

/**
 * Send a party out.
 *
 * `startedAt` is stored alongside `endsAt` so a wound-back clock cannot shorten
 * a run: the clock service damps rollback (SAVE_SCHEMA §7), and the pair is what
 * makes the record auditable if it ever fails to.
 */
export function sendExpedition(
  account: Account,
  slot: number,
  id: string,
  record: number,
  now: number,
): Account | SendRefusal {
  const def = getExpedition(id);
  if (!def) return 'noSuchExpedition';
  if (!partySlots(account).includes(slot)) return 'noSuchSlot';
  if (runningIn(account, slot) !== null) return 'slotBusy';
  if (def.minFloor > record) return 'tooDeep';

  return {
    ...account,
    expeditions: {
      ...account.expeditions,
      [String(slot)]: { id: def.id, startedAt: now, endsAt: now + durationOf(def) },
    },
  };
}

/** Empty one party slot. Used by both claiming and recalling. */
function clearSlot(account: Account, slot: number): Account {
  const expeditions = { ...account.expeditions };
  delete expeditions[String(slot)];
  return { ...account, expeditions };
}

export type RecallRefusal = 'nothingOut';

/**
 * Call a party home early, for nothing.
 *
 * Deliberately unpaid: a partial payout would make "send, recall, send again"
 * the optimal way to run the board, which is a worse game than waiting.
 */
export function recallExpedition(account: Account, slot: number): Account | RecallRefusal {
  if (runningIn(account, slot) === null) return 'nothingOut';
  return clearSlot(account, slot);
}

/**
 * What a route pays, at a depth, before the roll.
 *
 * The honest figure before the dice, for the card: gold and experience are the
 * floor curves the tower itself uses, taken at a fraction of the hero's record
 * and multiplied by the hours away. Using the same curves is the point — an
 * expedition can never quietly drift away from what a floor is worth.
 */
export interface ExpeditionEstimate {
  gold: number;
  xp: number;
  materials: number;
  /** Chance the party comes home with a summoning ticket. */
  ticketChance: number;
}

/** The depth an expedition is paid against. */
export function payingDepth(record: number): number {
  return Math.max(1, Math.floor(Math.max(1, record) * EXPEDITION_DEPTH_SHARE));
}

export function estimate(def: ExpeditionDef, record: number): ExpeditionEstimate {
  const depth = payingDepth(record);
  const floors = def.hours * EXPEDITION_FLOORS_PER_HOUR;
  const goldPerFloor = evaluate({ kind: 'exponential', ...FLOOR_GOLD }, depth);
  const xpPerFloor = evaluate({ kind: 'exponential', ...FLOOR_XP }, depth);
  const materialSpan = EXPEDITION_MATERIALS_PER_HOUR;
  const middle = (materialSpan.min + materialSpan.max) / 2;

  return {
    gold: Math.max(1, Math.round(goldPerFloor * floors * def.spoils.gold)),
    xp: Math.max(1, Math.round(xpPerFloor * floors * def.spoils.xp)),
    materials: Math.max(0, Math.round(def.hours * middle * def.spoils.materials)),
    ticketChance: Math.min(1, def.hours * EXPEDITION_TICKET_CHANCE_PER_HOUR * def.spoils.tickets),
  };
}

export interface RollSpoilsInput {
  def: ExpeditionDef;
  /** The claiming hero's record, which is what the payout is priced against. */
  record: number;
  /** The claiming hero's bracket, which decides the material tier (§13). */
  bracket: Bracket;
  rng: Rng;
}

/**
 * Roll what a finished expedition actually pays.
 *
 * Returns the same `FloorReward` shape the tower pays, so it banks through
 * `grantReward` like everything else — one place that remembers to add gold,
 * merge materials and convert experience into levels.
 *
 * Never gear and never echoes: every item in the game comes from a source §13
 * brackets, and echoes are paid for new ground alone (Q36).
 */
export function rollSpoils(input: RollSpoilsInput): FloorReward {
  const { def, record, bracket, rng } = input;
  const expected = estimate(def, record);
  const reward = emptyReward();

  // The same symmetrical band a floor's reward varies within, so a claim reads
  // like a climb rather than like a fixed payout with a timer in front of it.
  reward.gold = Math.max(1, Math.round(expected.gold * rng.range(0.88, 1.12)));
  reward.xp = Math.max(1, Math.round(expected.xp * rng.range(0.88, 1.12)));

  if (expected.materials > 0) {
    const id = materialIdForTier(bracket.materialTier);
    const count = rng.int(
      Math.max(1, Math.round(expected.materials * 0.7)),
      Math.max(1, Math.round(expected.materials * 1.3)),
    );
    reward.materials[id] = count;
  }

  if (expected.ticketChance > 0 && rng.chance(expected.ticketChance)) reward.tickets = 1;
  return reward;
}

export type ClaimRefusal = 'nothingOut' | 'notBack' | 'noSuchExpedition';

export interface ClaimResult {
  account: Account;
  def: ExpeditionDef;
  reward: FloorReward;
}

/**
 * Take the spoils of a finished expedition and free the slot.
 *
 * The account is returned rather than mutated and the reward is handed back
 * unbanked, because the character it belongs to is not this function's to touch
 * — `grantReward` does that, from one place, for every source in the game.
 */
export function claimExpedition(
  account: Account,
  slot: number,
  input: Omit<RollSpoilsInput, 'def'>,
  now: number,
): ClaimResult | ClaimRefusal {
  const state = runningIn(account, slot);
  if (!state) return 'nothingOut';
  if (!isBack(state, now)) return 'notBack';

  const def = getExpedition(state.id);
  if (!def) return 'noSuchExpedition';

  return {
    account: clearSlot(account, slot),
    def,
    reward: rollSpoils({ def, ...input }),
  };
}

/** True when at least one party is home and holding something. */
export function anyReady(
  account: Pick<Account, 'slotsUnlocked' | 'expeditions'>,
  now: number,
): boolean {
  return parties(account, now).some((party) => party.back);
}

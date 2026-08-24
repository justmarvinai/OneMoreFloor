/**
 * Deeds (Q40) — the account's ledger, and what it is owed.
 *
 * The whole feature rests on one decision: **every deed counts something the
 * game was already counting.** Seven read the quest board's own event stream —
 * the same events that advance a daily — and two are high-water marks read off
 * the account. Nothing here has a counter that exists only for deeds, which is
 * what keeps a deed from quietly drifting out of step with the thing it claims
 * to measure.
 *
 * They belong to the **account**, so a hero's death costs none of them (§3.3)
 * and a second hero inherits every one. What a tier pays is priced against the
 * depth the account has reached, so a deed claimed at floor 40 is worth forty
 * floors' effort and the same deed at floor 900 is worth nine hundred — a fixed
 * payout would be a fortune at the bottom and a rounding error at the top.
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  DEED_DEPTH_SHARE,
  DEED_MATERIALS,
  DEED_TICKET_FROM_TIER,
  DEED_TIER_FLOORS,
} from '@/content/balance/deeds.ts';
import { DEEDS, getDeed, tierKey, type DeedDef, type DeedTrack } from '@/content/deeds/index.ts';
import { FLOOR_GOLD } from '@/content/balance/rewards.ts';
import { materialIdForTier } from '@/content/items/index.ts';
import type { Rng } from '@/app/rng.ts';
import type { QuestEvent } from '../quests/types.ts';
import type { Account, Character } from '../character/types.ts';
import type { Bracket } from '../power/brackets.ts';
import { emptyReward, type FloorReward } from '../tower/rewards.ts';

export { DEEDS, getDeed, tierKey };
export type { DeedDef };

/** How much one batch of events adds to a deed that counts events. */
function fromEvents(track: DeedTrack, events: readonly QuestEvent[]): number {
  let total = 0;
  for (const event of events) {
    switch (track) {
      case 'floors':
        if (event.kind === 'floorCleared') total += 1;
        break;
      case 'bosses':
        if (event.kind === 'floorCleared' && event.isBoss) total += 1;
        break;
      case 'goldEarned':
        if (event.kind === 'goldEarned') total += event.amount;
        break;
      case 'goldSpent':
        if (event.kind === 'goldSpent') total += event.amount;
        break;
      case 'gearUpgraded':
        if (event.kind === 'gearUpgraded') total += 1;
        break;
      case 'itemBought':
        if (event.kind === 'itemBought') total += 1;
        break;
      case 'itemSold':
        if (event.kind === 'itemSold') total += 1;
        break;
      case 'potionDrunk':
        if (event.kind === 'potionDrunk') total += 1;
        break;
      // High-water marks are read from state, not counted from events.
      case 'deepestFloor':
      case 'bossRush':
        break;
    }
  }
  return total;
}

/** The value a high-water deed should sit at right now, read off the state. */
function highWater(
  track: DeedTrack,
  account: Pick<Account, 'bossRushBest'>,
  character: Pick<Character, 'tower'> | null,
): number | null {
  if (track === 'deepestFloor') return character?.tower.highestFloorEverCleared ?? null;
  if (track === 'bossRush') return account.bossRushBest;
  return null;
}

/**
 * Fold a batch of events, and the current state, into the ledger.
 *
 * Returns the account unchanged when nothing moved, so the caller can skip the
 * write — this runs after every action, and most actions advance nothing.
 */
export function recordDeeds(
  account: Account,
  events: readonly QuestEvent[],
  character: Pick<Character, 'tower'> | null = null,
): Account {
  const deeds = { ...account.deeds };
  let moved = false;

  for (const def of DEEDS) {
    const held = Math.max(0, Math.floor(deeds[def.id] ?? 0));
    const mark = highWater(def.track, account, character);

    // A high-water deed is *set* to the best seen, never added to: it measures a
    // record, and a record that accumulated would measure attempts instead.
    const next = mark === null ? held + fromEvents(def.track, events) : Math.max(held, mark);
    if (next === held) continue;

    deeds[def.id] = next;
    moved = true;
  }

  return moved ? { ...account, deeds } : account;
}

/** Everything one deed's row needs, without the screen doing arithmetic. */
export interface DeedStatus {
  def: DeedDef;
  /** How far the ledger has got. */
  progress: number;
  /** The tier being worked towards, or null when every tier is claimed. */
  tier: number | null;
  /** The threshold of that tier. */
  need: number;
  /** Tiers earned but not yet claimed, lowest first. */
  claimable: number[];
  /** Tiers already paid. */
  claimed: number[];
}

export function deedStatus(
  account: Pick<Account, 'deeds' | 'deedsClaimed'>,
  def: DeedDef,
): DeedStatus {
  const progress = Math.max(0, Math.floor(account.deeds[def.id] ?? 0));
  const claimed: number[] = [];
  const claimable: number[] = [];

  for (const [tier, need] of def.tiers.entries()) {
    if (account.deedsClaimed.includes(tierKey(def.id, tier))) claimed.push(tier);
    else if (progress >= need) claimable.push(tier);
  }

  // The tier being worked towards: the shallowest not yet reached, or the
  // shallowest unclaimed one when everything has been reached.
  const nextTier = def.tiers.findIndex(
    (need, tier) => progress < need || (!claimed.includes(tier) && !claimable.includes(tier)),
  );
  const tier = nextTier >= 0 ? nextTier : claimed.length < def.tiers.length ? claimed.length : null;

  return {
    def,
    progress,
    tier,
    need: tier === null ? (def.tiers.at(-1) ?? 0) : (def.tiers[tier] ?? 0),
    claimable,
    claimed,
  };
}

/** The whole board, in the order the ledger lists it. */
export function deedBoard(account: Pick<Account, 'deeds' | 'deedsClaimed'>): DeedStatus[] {
  return DEEDS.map((def) => deedStatus(account, def));
}

/** True when at least one tier is sitting there earned and unpaid. */
export function anyClaimable(account: Pick<Account, 'deeds' | 'deedsClaimed'>): boolean {
  return deedBoard(account).some((status) => status.claimable.length > 0);
}

export type DeedRefusal = 'noSuchDeed' | 'notEarned' | 'alreadyClaimed';

export interface DeedClaim {
  account: Account;
  def: DeedDef;
  tier: number;
  reward: FloorReward;
}

/** What a tier pays, before the roll, at a given depth. */
export interface DeedEstimate {
  gold: number;
  materials: number;
  ticket: boolean;
}

export function deedEstimate(tier: number, record: number): DeedEstimate {
  const floors = DEED_TIER_FLOORS[tier] ?? DEED_TIER_FLOORS.at(-1) ?? 1;
  const depth = Math.max(1, Math.floor(Math.max(1, record) * DEED_DEPTH_SHARE));
  const perFloor = evaluate({ kind: 'exponential', ...FLOOR_GOLD }, depth);
  const middle = (DEED_MATERIALS.min + DEED_MATERIALS.max) / 2;

  return {
    gold: Math.max(1, Math.round(perFloor * floors)),
    materials: Math.max(1, Math.round(middle * (tier + 1))),
    ticket: tier >= DEED_TICKET_FROM_TIER,
  };
}

export interface ClaimDeedInput {
  /** The claiming hero's record, which the payout is priced against. */
  record: number;
  /** The claiming hero's bracket, which decides the material tier (§13). */
  bracket: Bracket;
  rng: Rng;
}

/**
 * Settle one tier.
 *
 * The account is returned rather than mutated and the reward handed back
 * unbanked, because the character it belongs to is not this function's to touch
 * — `grantReward` does that, from one place, for every source in the game.
 */
export function claimDeed(
  account: Account,
  id: string,
  tier: number,
  input: ClaimDeedInput,
): DeedClaim | DeedRefusal {
  const def = getDeed(id);
  if (!def) return 'noSuchDeed';

  const key = tierKey(def.id, tier);
  if (account.deedsClaimed.includes(key)) return 'alreadyClaimed';

  const need = def.tiers[tier];
  if (need === undefined) return 'noSuchDeed';
  if ((account.deeds[def.id] ?? 0) < need) return 'notEarned';

  const expected = deedEstimate(tier, input.record);
  const reward = emptyReward();
  reward.gold = Math.max(1, Math.round(expected.gold * input.rng.range(0.9, 1.1)));
  reward.materials[materialIdForTier(input.bracket.materialTier)] = expected.materials;
  if (expected.ticket) reward.tickets = 1;

  return {
    account: { ...account, deedsClaimed: [...account.deedsClaimed, key] },
    def,
    tier,
    reward,
  };
}

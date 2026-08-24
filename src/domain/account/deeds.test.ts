import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { DEED_TICKET_FROM_TIER, DEED_TIER_FLOORS } from '@/content/balance/deeds.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { DEEDS, tierKey } from '@/content/deeds/index.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import type { QuestEvent } from '@/domain/quests/types.ts';
import {
  anyClaimable,
  claimDeed,
  deedBoard,
  deedEstimate,
  deedStatus,
  recordDeeds,
} from './deeds.ts';

function account(overrides: Partial<Account> = {}): Account {
  return {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: true,
    backpackSlots: STARTING_BACKPACK_SLOTS,
    bestiary: {},
    echoes: 0,
    echoesEarned: 0,
    echoNodes: {},
    deeds: {},
    deedsClaimed: [],
    bossRushBest: 0,
    expeditions: {},
    pets: {},
    ...overrides,
  };
}

/** Only the part of a character the ledger reads. */
function hero(record: number): Pick<Character, 'tower'> {
  return { tower: { highestFloorEverCleared: record } } as Pick<Character, 'tower'>;
}

const FLOORS = DEEDS.find((def) => def.track === 'floors')!;
const BOSSES = DEEDS.find((def) => def.track === 'bosses')!;
const GOLD = DEEDS.find((def) => def.track === 'goldEarned')!;
const DEEPEST = DEEDS.find((def) => def.track === 'deepestFloor')!;
const RUSH = DEEDS.find((def) => def.track === 'bossRush')!;

const CLAIM = { record: 400, bracket: bracketAt(10), rng: createRng('claim') };

describe('the ledger (Q40)', () => {
  it('gives every deed three tiers, in ascending order', () => {
    for (const def of DEEDS) {
      expect(def.tiers).toHaveLength(3);
      expect(def.tiers[0]).toBeLessThan(def.tiers[1]);
      expect(def.tiers[1]).toBeLessThan(def.tiers[2]);
    }
  });

  it('keeps every id unique, and every track one the game already counts', () => {
    expect(new Set(DEEDS.map((def) => def.id)).size).toBe(DEEDS.length);
    // Every deed reads either the quest board's events or a high-water mark.
    // Nothing here needs a counter that exists only for deeds.
    expect(DEEDS.every((def) => typeof def.track === 'string')).toBe(true);
  });
});

describe('counting (Q40)', () => {
  const cleared: QuestEvent[] = [
    { kind: 'floorCleared', floor: 11, isBoss: false },
    { kind: 'floorCleared', floor: 20, isBoss: true },
  ];

  it('counts floors, and bosses among them', () => {
    const after = recordDeeds(account(), cleared);
    expect(after.deeds[FLOORS.id]).toBe(2);
    expect(after.deeds[BOSSES.id]).toBe(1);
  });

  it('sums the amounts on the events that carry one', () => {
    const after = recordDeeds(account(), [
      { kind: 'goldEarned', amount: 400 },
      { kind: 'goldEarned', amount: 600 },
    ]);
    expect(after.deeds[GOLD.id]).toBe(1000);
  });

  it('accumulates across batches, because a ledger is lifetime', () => {
    const once = recordDeeds(account(), cleared);
    expect(recordDeeds(once, cleared).deeds[FLOORS.id]).toBe(4);
  });

  it('leaves the account alone when nothing moved', () => {
    const held = account();
    expect(recordDeeds(held, [])).toBe(held);
    expect(recordDeeds(held, [{ kind: 'itemBought' }])).not.toBe(held);
  });

  it('sets a high-water deed rather than adding to it', () => {
    // A record that accumulated would measure attempts, not depth.
    const deep = recordDeeds(account(), [], hero(300));
    expect(deep.deeds[DEEPEST.id]).toBe(300);

    const again = recordDeeds(deep, [], hero(300));
    expect(again.deeds[DEEPEST.id]).toBe(300);

    const shallower = recordDeeds(deep, [], hero(20));
    expect(shallower.deeds[DEEPEST.id]).toBe(300);
  });

  it('reads the Boss Rush record off the account it lives on', () => {
    expect(recordDeeds(account({ bossRushBest: 7 }), []).deeds[RUSH.id]).toBe(7);
  });
});

describe('reading a row (Q40)', () => {
  it('works towards the shallowest tier not yet reached', () => {
    const status = deedStatus(account({ deeds: { [FLOORS.id]: 0 } }), FLOORS);
    expect(status.tier).toBe(0);
    expect(status.need).toBe(FLOORS.tiers[0]);
    expect(status.claimable).toEqual([]);
  });

  it('reports a reached tier as owed until it is settled', () => {
    const earned = account({ deeds: { [FLOORS.id]: FLOORS.tiers[1] } });
    expect(deedStatus(earned, FLOORS).claimable).toEqual([0, 1]);
    expect(anyClaimable(earned)).toBe(true);

    const paid = { ...earned, deedsClaimed: [tierKey(FLOORS.id, 0), tierKey(FLOORS.id, 1)] };
    expect(deedStatus(paid, FLOORS).claimable).toEqual([]);
    expect(deedStatus(paid, FLOORS).claimed).toEqual([0, 1]);
  });

  it('says when there is nothing left to settle', () => {
    const done = account({
      deeds: { [FLOORS.id]: FLOORS.tiers[2] },
      deedsClaimed: FLOORS.tiers.map((_, tier) => tierKey(FLOORS.id, tier)),
    });
    expect(deedStatus(done, FLOORS).tier).toBeNull();
    expect(deedStatus(done, FLOORS).claimable).toEqual([]);
  });

  it('lists every deed on the board, whatever state it is in', () => {
    expect(deedBoard(account())).toHaveLength(DEEDS.length);
    expect(anyClaimable(account())).toBe(false);
  });
});

describe('settling one (Q40)', () => {
  it('pays, and marks the tier so it cannot pay twice', () => {
    const earned = account({ deeds: { [FLOORS.id]: FLOORS.tiers[0] } });
    const result = claimDeed(earned, FLOORS.id, 0, CLAIM);
    if (typeof result === 'string') throw new Error(result);

    expect(result.reward.gold).toBeGreaterThan(0);
    expect(Object.keys(result.reward.materials)).toHaveLength(1);
    expect(result.account.deedsClaimed).toContain(tierKey(FLOORS.id, 0));

    expect(claimDeed(result.account, FLOORS.id, 0, CLAIM)).toBe('alreadyClaimed');
  });

  it('refuses in words rather than in silence', () => {
    expect(claimDeed(account(), 'deed.nonesuch', 0, CLAIM)).toBe('noSuchDeed');
    expect(claimDeed(account(), FLOORS.id, 9, CLAIM)).toBe('noSuchDeed');
    expect(claimDeed(account(), FLOORS.id, 0, CLAIM)).toBe('notEarned');
  });

  it('draws its materials from the claiming hero’s bracket (§13)', () => {
    // Never from the deed: the ledger cannot hand over something the hero could
    // not have earned themselves.
    const earned = account({ deeds: { [FLOORS.id]: FLOORS.tiers[0] } });
    const shallow = claimDeed(earned, FLOORS.id, 0, { ...CLAIM, bracket: bracketAt(0) });
    const deep = claimDeed(earned, FLOORS.id, 0, { ...CLAIM, bracket: bracketAt(30) });
    if (typeof shallow === 'string' || typeof deep === 'string') throw new Error('refused');

    expect(Object.keys(shallow.reward.materials)).not.toEqual(Object.keys(deep.reward.materials));
  });

  it('never pays gear, because gear comes from sources §13 brackets', () => {
    const earned = account({ deeds: { [FLOORS.id]: FLOORS.tiers[2] } });
    const result = claimDeed(earned, FLOORS.id, 2, CLAIM);
    if (typeof result === 'string') throw new Error(result);
    expect(result.reward.items).toHaveLength(0);
  });
});

describe('what a tier is worth (Q40)', () => {
  it('is priced against the depth the account has reached', () => {
    expect(deedEstimate(0, 500).gold).toBeGreaterThan(deedEstimate(0, 20).gold);
  });

  it('pays more the deeper the tier', () => {
    expect(deedEstimate(2, 200).gold).toBeGreaterThan(deedEstimate(0, 200).gold);
    expect(DEED_TIER_FLOORS[2]).toBeGreaterThan(DEED_TIER_FLOORS[0]!);
  });

  it('keeps the summoning ticket for the last tier alone', () => {
    expect(deedEstimate(0, 200).ticket).toBe(false);
    expect(deedEstimate(DEED_TICKET_FROM_TIER, 200).ticket).toBe(true);
  });

  it('always pays something, however shallow the account', () => {
    const tiny = deedEstimate(0, 0);
    expect(tiny.gold).toBeGreaterThan(0);
    expect(tiny.materials).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import {
  EXPEDITIONS_PER_SLOT,
  EXPEDITION_DEPTH_SHARE,
  EXPEDITION_FLOORS_PER_HOUR,
} from '@/content/balance/expeditions.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { MAX_CHARACTER_SLOTS } from '@/content/balance/progression.ts';
import { EXPEDITIONS } from '@/content/expeditions/index.ts';
import { FLOOR_GOLD } from '@/content/balance/rewards.ts';
import { evaluate } from '@/content/balance/curves.ts';
import type { Account } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import {
  anyReady,
  claimExpedition,
  durationOf,
  estimate,
  expeditionsFor,
  isBack,
  parties,
  partyCount,
  payingDepth,
  recallExpedition,
  rollSpoils,
  runningIn,
  sendExpedition,
} from './expeditions.ts';

const NOW = 1_700_000_000_000;
const SHORT = EXPEDITIONS[0]!;
const DEEP = EXPEDITIONS[EXPEDITIONS.length - 1]!;

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

/** Send the short route from slot 1, failing loudly if the board refuses. */
function sent(held: Account = account(), record = 9999, now = NOW): Account {
  const result = sendExpedition(held, 1, SHORT.id, record, now);
  if (typeof result === 'string') throw new Error(result);
  return result;
}

describe('the board (Q37)', () => {
  it('offers a route at every scale, from an errand to a full day', () => {
    const hours = EXPEDITIONS.map((def) => def.hours);
    expect(Math.min(...hours)).toBeLessThanOrEqual(2);
    expect(Math.max(...hours)).toBeGreaterThanOrEqual(24);
    expect(new Set(hours).size).toBe(EXPEDITIONS.length);
  });

  it('opens the first route to a hero who has cleared nothing at all', () => {
    // Record zero, not one: a board with nothing on it is the first thing a new
    // player would see, and it would teach them the feature is not for them.
    expect(expeditionsFor(0).length).toBeGreaterThan(0);
  });

  it('gates the deep routes behind a record, and says so by omission', () => {
    expect(expeditionsFor(1)).not.toContain(DEEP);
    expect(expeditionsFor(DEEP.minFloor)).toContain(DEEP);
  });

  it('never pays gear or echoes, whatever the route', () => {
    // Every item comes from a source §13 brackets, and echoes are paid for new
    // ground alone (Q36). A timer is not allowed to be a fourth item source.
    for (const def of EXPEDITIONS) {
      const reward = rollSpoils({
        def,
        record: 400,
        bracket: bracketAt(10),
        rng: createRng(`spoils:${def.id}`),
      });
      expect(reward.items).toHaveLength(0);
      expect(reward.luckyTickets).toBe(0);
    }
  });
});

describe('parties (Q37)', () => {
  it('gives a brand-new account one party before it has bought anything', () => {
    expect(partyCount(account())).toBe(EXPEDITIONS_PER_SLOT);
    expect(parties(account(), NOW)).toHaveLength(EXPEDITIONS_PER_SLOT);
  });

  it('grows with the character slots the account has opened', () => {
    expect(partyCount(account({ slotsUnlocked: 3 }))).toBeGreaterThan(partyCount(account()));
  });

  it('never reports more parties than the game has slots', () => {
    const absurd = account({ slotsUnlocked: 999 });
    expect(partyCount(absurd)).toBe(MAX_CHARACTER_SLOTS * EXPEDITIONS_PER_SLOT);
  });

  it('reports a party waiting for orders as empty', () => {
    const [party] = parties(account(), NOW);
    expect(party?.state).toBeNull();
    expect(party?.back).toBe(false);
  });
});

describe('sending one out (Q37)', () => {
  it('records when it left and when it is due', () => {
    const out = sent();
    const state = runningIn(out, 1)!;

    expect(state.id).toBe(SHORT.id);
    expect(state.startedAt).toBe(NOW);
    expect(state.endsAt).toBe(NOW + durationOf(SHORT));
  });

  it('refuses in words rather than in silence', () => {
    expect(sendExpedition(account(), 1, 'expedition.nonesuch', 9999, NOW)).toBe('noSuchExpedition');
    expect(sendExpedition(account(), 9, SHORT.id, 9999, NOW)).toBe('noSuchSlot');
    expect(sendExpedition(account(), 1, DEEP.id, 1, NOW)).toBe('tooDeep');
    expect(sendExpedition(sent(), 1, SHORT.id, 9999, NOW)).toBe('slotBusy');
  });

  it('leaves the other parties alone', () => {
    const wide = sent(account({ slotsUnlocked: 3 }));
    expect(runningIn(wide, 2)).toBeNull();
    expect(runningIn(wide, 3)).toBeNull();
  });
});

describe('waiting, and coming home (Q37)', () => {
  const bracket = bracketAt(10);
  const claimInput = { record: 400, bracket, rng: createRng('claim') };

  it('is not back until the clock says so', () => {
    const out = sent();
    const state = runningIn(out, 1)!;

    expect(isBack(state, NOW)).toBe(false);
    expect(isBack(state, state.endsAt - 1)).toBe(false);
    expect(isBack(state, state.endsAt)).toBe(true);
    expect(anyReady(out, NOW)).toBe(false);
    expect(anyReady(out, state.endsAt)).toBe(true);
  });

  it('refuses a claim before the party is due, and says which', () => {
    const out = sent();
    expect(claimExpedition(out, 1, claimInput, NOW)).toBe('notBack');
    expect(claimExpedition(account(), 1, claimInput, NOW)).toBe('nothingOut');
  });

  it('pays, and frees the party, once it is due', () => {
    const out = sent();
    const due = runningIn(out, 1)!.endsAt;
    const result = claimExpedition(out, 1, claimInput, due);
    if (typeof result === 'string') throw new Error(result);

    expect(result.def.id).toBe(SHORT.id);
    expect(result.reward.gold).toBeGreaterThan(0);
    expect(result.reward.xp).toBeGreaterThan(0);
    expect(runningIn(result.account, 1)).toBeNull();
  });

  it('draws its materials from the claiming hero’s bracket (§13)', () => {
    // Never from the route: a party cannot hand over something the hero could
    // not have earned themselves.
    const shallow = rollSpoils({
      def: EXPEDITIONS[2]!,
      record: 400,
      bracket: bracketAt(0),
      rng: createRng('shallow'),
    });
    const deep = rollSpoils({
      def: EXPEDITIONS[2]!,
      record: 400,
      bracket: bracketAt(30),
      rng: createRng('deep'),
    });

    expect(Object.keys(shallow.materials)).not.toEqual(Object.keys(deep.materials));
  });

  it('comes home empty when recalled, and frees the party', () => {
    const out = sent();
    const home = recallExpedition(out, 1);
    if (typeof home === 'string') throw new Error(home);

    expect(runningIn(home, 1)).toBeNull();
    expect(recallExpedition(account(), 1)).toBe('nothingOut');
  });
});

describe('what an hour away is worth (Q37)', () => {
  it('is priced against the floors the hero has actually reached', () => {
    const shallow = estimate(SHORT, 10);
    const deep = estimate(SHORT, 500);
    expect(deep.gold).toBeGreaterThan(shallow.gold);
    expect(deep.xp).toBeGreaterThan(shallow.xp);
  });

  it('pays below the hero’s own record, because a party is not the hero', () => {
    expect(payingDepth(100)).toBeLessThan(100);
    expect(payingDepth(100)).toBe(Math.floor(100 * EXPEDITION_DEPTH_SHARE));
    // And never nothing, however shallow the record.
    expect(payingDepth(0)).toBeGreaterThan(0);
  });

  it('never beats climbing, which is the rule the whole game rests on', () => {
    // A day-long expedition against a day of *play*: the longest route on the
    // board is worth less than a hundred floors, and a player clears far more
    // than that in twenty-four hours of climbing.
    const record = 500;
    const perFloor = evaluate({ kind: 'exponential', ...FLOOR_GOLD }, payingDepth(record));
    const day = estimate(DEEP, record);
    const floorsWorth = day.gold / perFloor;

    expect(floorsWorth).toBeLessThanOrEqual(DEEP.hours * EXPEDITION_FLOORS_PER_HOUR * 1.5);
  });

  it('scales with the hours away, so a long route is worth waiting for', () => {
    const record = 600;
    expect(estimate(DEEP, record).gold).toBeGreaterThan(estimate(SHORT, record).gold);
  });

  it('finds a ticket only on the routes that look for one', () => {
    for (const def of EXPEDITIONS) {
      const chance = estimate(def, 400).ticketChance;
      if (def.spoils.tickets === 0) expect(chance).toBe(0);
      else expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
  });

  it('varies a claim the way a floor varies, rather than paying a fixed sum', () => {
    const rolls = Array.from(
      { length: 30 },
      (_, index) =>
        rollSpoils({
          def: SHORT,
          record: 400,
          bracket: bracketAt(10),
          rng: createRng(`vary:${index}`),
        }).gold,
    );
    expect(new Set(rolls).size).toBeGreaterThan(1);
  });
});

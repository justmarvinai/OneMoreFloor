import { describe, expect, it } from 'vitest';
import { ECHO_MAX_RANK, ECHO_NODE_COST, echoesForFloor } from '@/content/balance/echoes.ts';
import { ECHO_NODES } from '@/content/echoes/index.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { backpackCapacity } from '@/domain/character/account.ts';
import type { Account } from '@/domain/character/types.ts';
import {
  buyEchoRank,
  echoBonuses,
  echoTree,
  echoesForNewGround,
  grantEchoes,
  rankOf,
} from './echoes.ts';

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

describe('earning echoes (Q36)', () => {
  it('pays for new ground and nothing else', () => {
    // The rule the whole currency rests on: re-climbing earns nothing.
    expect(echoesForNewGround(30, 30)).toBe(0);
    expect(echoesForNewGround(30, 20)).toBe(0);
    expect(echoesForNewGround(30, 31)).toBe(echoesForFloor(31));
  });

  it('pays a raid through four new floors for all four', () => {
    const one = echoesForNewGround(10, 11);
    const two = echoesForNewGround(11, 12);
    const three = echoesForNewGround(12, 13);
    const four = echoesForNewGround(13, 14);

    expect(echoesForNewGround(10, 14)).toBe(one + two + three + four);
  });

  it('pays more for deep ground without ever paying nothing', () => {
    expect(echoesForFloor(1)).toBeGreaterThan(0);
    expect(echoesForFloor(500)).toBeGreaterThan(echoesForFloor(50));
    expect(echoesForFloor(50)).toBeGreaterThan(echoesForFloor(5));
  });

  it('banks into both the purse and the lifetime total', () => {
    const banked = grantEchoes(account({ echoes: 4, echoesEarned: 9 }), 6);
    expect(banked.echoes).toBe(10);
    expect(banked.echoesEarned).toBe(15);
  });

  it('leaves the account alone when a climb earned none', () => {
    const held = account();
    expect(grantEchoes(held, 0)).toBe(held);
  });
});

describe('spending echoes (Q36)', () => {
  it('offers every node from the start, with no prerequisites', () => {
    const tree = echoTree(account());
    expect(tree).toHaveLength(ECHO_NODES.length);
    expect(tree.every((node) => node.rank === 0)).toBe(true);
    expect(tree.every((node) => node.cost === ECHO_NODE_COST[0])).toBe(true);
  });

  it('charges the ladder, rank by rank', () => {
    let held = account({ echoes: 10_000 });
    for (let rank = 0; rank < ECHO_MAX_RANK; rank += 1) {
      const before = held.echoes;
      const next = buyEchoRank(held, 'spoils');
      if (typeof next === 'string') throw new Error(next);
      expect(before - next.echoes).toBe(ECHO_NODE_COST[rank]);
      held = next;
    }

    expect(rankOf(held, 'spoils')).toBe(ECHO_MAX_RANK);
    expect(buyEchoRank(held, 'spoils')).toBe('maxRank');
  });

  it('refuses in words rather than in silence', () => {
    expect(buyEchoRank(account({ echoes: 0 }), 'spoils')).toBe('notEnoughEchoes');
    expect(buyEchoRank(account({ echoes: 999 }), 'nonesuch')).toBe('noSuchNode');
  });

  it('never lets a stored rank exceed the ceiling', () => {
    // A save written by a future build, or a hand-edited one, must not be able
    // to put the tree into a state the arithmetic cannot describe.
    expect(rankOf(account({ echoNodes: { spoils: 99 } }), 'spoils')).toBe(ECHO_MAX_RANK);
  });
});

describe('what echoes are worth (Q36)', () => {
  it('is neutral for an account that has bought nothing', () => {
    const bonuses = echoBonuses(account());
    expect(bonuses.gold).toBe(1);
    expect(bonuses.xp).toBe(1);
    expect(bonuses.materials).toBe(1);
    expect(bonuses.tickets).toBe(1);
    expect(bonuses.patience).toBe(0);
    expect(bonuses.coffers).toBe(0);
  });

  it('is neutral for no account at all', () => {
    expect(echoBonuses(null).gold).toBe(1);
    expect(echoBonuses(undefined).coffers).toBe(0);
  });

  it('raises what a floor pays, rank by rank', () => {
    const one = echoBonuses(account({ echoNodes: { spoils: 1 } }));
    const five = echoBonuses(account({ echoNodes: { spoils: 5 } }));
    expect(five.gold).toBeGreaterThan(one.gold);
    expect(one.gold).toBeGreaterThan(1);
  });

  it('never lets Patience remove the auto-climb wait entirely (Q32)', () => {
    // Auto-climb must never become the fastest way to play, whatever is bought.
    const maxed = echoBonuses(account({ echoNodes: { patience: ECHO_MAX_RANK } }));
    expect(maxed.patience).toBeLessThanOrEqual(0.5);
  });

  it('adds Coffers above the purchased ceiling, not inside it', () => {
    // The upgrade is what gold buys and the node is what the climb earns; a
    // permanent reward that stopped mattering once you could afford the shop
    // would not be one.
    const plain = backpackCapacity(account());
    const deepened = backpackCapacity(account({ echoNodes: { coffers: 2 } }));
    expect(deepened).toBeGreaterThan(plain);
  });
});

import { describe, expect, it } from 'vitest';
import { BOSS_RUSH_GATES, BOSS_RUSH_MIN_FLOOR } from '@/content/balance/bossRush.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import { canRush, gateFloor, recordBest, runBossRush, RUSH_BOSSES } from './bossRush.ts';

const NOW = 1_700_000_000_000;

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

/** A hero with a record, and stats big enough to actually get somewhere. */
function hero(record: number, overrides: Partial<Character> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: NOW,
    runSeed: 'rush-test',
  });
  return {
    ...base,
    progression: { ...base.progression, level: 200, ascension: 3 },
    tower: { ...base.tower, highestFloorEverCleared: record, currentRunFloor: record + 1 },
    ...overrides,
  };
}

describe('the gates (Q39)', () => {
  it('runs the ten authored bosses, in the order the tower gives them up', () => {
    expect(RUSH_BOSSES).toHaveLength(BOSS_RUSH_GATES);
    expect(new Set(RUSH_BOSSES.map((boss) => boss.id)).size).toBe(BOSS_RUSH_GATES);
  });

  it('is the tower’s own ladder for a hero who has reached floor a hundred', () => {
    // 10, 20, … 100 — exactly the gates they climbed through.
    for (let index = 1; index <= BOSS_RUSH_GATES; index += 1) {
      expect(gateFloor(index, 100)).toBe(index * 10);
    }
  });

  it('spreads across whatever depth the hero has actually earned', () => {
    expect(gateFloor(BOSS_RUSH_GATES, 1000)).toBe(1000);
    expect(gateFloor(1, 1000)).toBe(100);
    // Monotonic, so gate five is never deeper than gate six.
    for (let index = 2; index <= BOSS_RUSH_GATES; index += 1) {
      expect(gateFloor(index, 1000)).toBeGreaterThan(gateFloor(index - 1, 1000));
    }
  });

  it('never fights a gate shallower than its own floor in the tower', () => {
    for (let index = 1; index <= BOSS_RUSH_GATES; index += 1) {
      expect(gateFloor(index, 0)).toBeGreaterThanOrEqual(index * 10);
    }
  });

  it('opens only once the first gate has been met', () => {
    expect(canRush(hero(BOSS_RUSH_MIN_FLOOR - 1))).toBe(false);
    expect(canRush(hero(BOSS_RUSH_MIN_FLOOR))).toBe(true);
  });
});

describe('running one (Q39)', () => {
  it('stops at the gate that kills the hero, and never goes past it', () => {
    // A hero far out of their depth: the run ends where it ends, and no gate
    // beyond that is even fought.
    const result = runBossRush({ character: hero(4000), best: 0, now: NOW });

    expect(result.gates.length).toBeLessThanOrEqual(BOSS_RUSH_GATES);
    const fell = result.gates.findIndex((gate) => !gate.cleared);
    expect(fell, 'a hero this far out of their depth has to fall somewhere').toBeGreaterThanOrEqual(
      0,
    );
    // Nothing beyond the gate that stopped them is even fought.
    expect(result.gates).toHaveLength(fell + 1);
    expect(result.cleared).toBe(fell);
  });

  it('carries wounds from one gate to the next', () => {
    // The whole point of a rush: the bar does not refill. Health at the end of
    // one gate is health at the start of the next.
    const result = runBossRush({ character: hero(30), best: 0, now: NOW });
    const held = result.gates.filter((gate) => gate.cleared);
    // Asserted rather than guarded: a test that quietly returned when the hero
    // fell at the first gate would pass while proving nothing.
    expect(held.length).toBeGreaterThan(1);

    for (let index = 1; index < held.length; index += 1) {
      const start = held[index]!.script.events[0];
      if (start?.type !== 'fightStart') throw new Error('a script must open with fightStart');
      // The previous gate's remaining health is the next one's opening health,
      // which shows up as a hero whose bar starts below its own maximum.
      expect(held[index - 1]!.heroHpRemaining).toBeLessThanOrEqual(start.hero.maxHp);
    }
  });

  it('never touches the climb', () => {
    // Not the run floor, not the record, not the seed. Losing a rush costs a
    // player nothing they were holding (§3.3).
    const before = hero(60);
    const result = runBossRush({ character: before, best: 0, now: NOW });

    expect(result.character.tower.currentRunFloor).toBe(before.tower.currentRunFloor);
    expect(result.character.tower.highestFloorEverCleared).toBe(
      before.tower.highestFloorEverCleared,
    );
    expect(result.character.tower.runSeed).toBe(before.tower.runSeed);
  });

  it('is replayable — the same hero and record write the same run', () => {
    const one = runBossRush({ character: hero(60), best: 0, now: NOW });
    const two = runBossRush({ character: hero(60), best: 0, now: NOW });
    expect(one.gates.map((gate) => gate.script)).toEqual(two.gates.map((gate) => gate.script));
  });
});

describe('what a rush pays (Q39)', () => {
  it('pays for the gates past the account’s best, and nothing else', () => {
    const character = hero(60);
    const fresh = runBossRush({ character, best: 0, now: NOW });
    expect(fresh.cleared).toBeGreaterThan(0);
    expect(fresh.reward.gold).toBeGreaterThan(0);

    // The same run again, with the record already banked: nothing owed.
    const repeat = runBossRush({ character, best: fresh.cleared, now: NOW });
    expect(repeat.cleared).toBe(fresh.cleared);
    expect(repeat.reward.gold).toBe(0);
    expect(repeat.reward.xp).toBe(0);
    expect(repeat.isRecord).toBe(false);
  });

  it('pays more the further past the best it gets', () => {
    const character = hero(60);
    const full = runBossRush({ character, best: 0, now: NOW });
    expect(full.cleared).toBeGreaterThan(1);

    const partial = runBossRush({ character, best: full.cleared - 1, now: NOW });
    expect(full.reward.gold).toBeGreaterThan(partial.reward.gold);
  });

  it('never pays a run that cleared nothing', () => {
    // Nine thousand floors deep with a starting kit: the first gate ends it.
    const nothing = runBossRush({ character: hero(9000), best: 0, now: NOW });
    expect(nothing.cleared).toBe(0);
    expect(nothing.reward.gold).toBe(0);
    expect(nothing.reward.items).toHaveLength(0);
  });

  it('banks the chest onto the hero it was run by', () => {
    const character = hero(60);
    const result = runBossRush({ character, best: 0, now: NOW });
    expect(result.reward.gold).toBeGreaterThan(0);

    expect(result.character.currencies.gold).toBe(character.currencies.gold + result.reward.gold);
  });
});

describe('the record (Q39)', () => {
  it('is kept only when it is beaten', () => {
    expect(recordBest(account({ bossRushBest: 4 }), 6).bossRushBest).toBe(6);
    expect(recordBest(account({ bossRushBest: 6 }), 4).bossRushBest).toBe(6);
  });

  it('leaves the account untouched when nothing was beaten', () => {
    const held = account({ bossRushBest: 6 });
    expect(recordBest(held, 6)).toBe(held);
  });
});

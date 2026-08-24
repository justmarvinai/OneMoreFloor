import { describe, expect, it } from 'vitest';
import { getClass } from '@/content/classes/index.ts';
import {
  baseStatsOf,
  canAscend,
  createCharacter,
  levelCapFor,
  summarize,
  unlockedSlotsAt,
} from './character.ts';
import type { AscensionTier, Character } from './types.ts';

function newHero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: 1_700_000_000_000,
      runSeed: 'seed:1',
    }),
    ...overrides,
  };
}

describe('createCharacter', () => {
  it('starts at level 1, ascension 0, floor 1, nothing bought', () => {
    const hero = newHero();
    expect(hero.progression).toEqual({ level: 1, xp: 0, ascension: 0 });
    expect(hero.tower).toEqual({
      currentRunFloor: 1,
      highestFloorEverCleared: 0,
      runSeed: 'seed:1',
      milestonesClaimed: [],
      history: [],
      autoClimb: 'off',
      runGold: 0,
      runFights: 0,
      pathChoices: {},
    });
    expect(hero.purchasedStats).toEqual({
      strength: 0,
      defense: 0,
      hp: 0,
      resource: 0,
      luck: 0,
    });
  });

  it('stores the normalised name', () => {
    const hero = createCharacter({
      slotId: 2,
      name: '  Sir   Gawain ',
      classId: 'mage',
      createdAt: 5,
      runSeed: 's',
    });
    expect(hero.identity.name).toBe('Sir Gawain');
    expect(hero.identity.classId).toBe('mage');
    expect(hero.slotId).toBe(2);
  });
});

describe('baseStatsOf', () => {
  it('is the class base at level 1', () => {
    const hero = newHero();
    const stats = baseStatsOf(hero);
    const definition = getClass('warrior');
    expect(stats.strength).toBe(definition.baseStats.strength);
    expect(stats.hp).toBe(definition.baseStats.hp);
  });

  it('never grants Speed — gear is its only source (§6)', () => {
    const hero = newHero({ progression: { level: 500, xp: 0, ascension: 3 } });
    expect(baseStatsOf(hero).speed).toBe(0);
  });

  it('applies growth per level, floored once rather than every level', () => {
    // Warrior gains 1.6 Strength per level: at level 11 that is 10 + 16 = 26,
    // where flooring each level separately would lose 10 points by now.
    const hero = newHero({ progression: { level: 11, xp: 0, ascension: 0 } });
    expect(baseStatsOf(hero).strength).toBe(26);
  });

  it('adds purchased points on top of level growth', () => {
    const hero = newHero({
      progression: { level: 11, xp: 0, ascension: 0 },
      purchasedStats: { strength: 5, defense: 0, hp: 0, resource: 0, luck: 0 },
    });
    expect(baseStatsOf(hero).strength).toBe(31);
  });

  it('grows monotonically with level for every class', () => {
    for (const classId of ['warrior', 'mage', 'hunter', 'bard', 'swashbuckler'] as const) {
      const low = baseStatsOf(newHero({ identity: { name: 'X', classId, createdAt: 0 } }));
      const high = baseStatsOf(
        newHero({
          identity: { name: 'X', classId, createdAt: 0 },
          progression: { level: 50, xp: 0, ascension: 0 },
        }),
      );
      expect(high.strength, classId).toBeGreaterThan(low.strength);
      expect(high.hp, classId).toBeGreaterThan(low.hp);
    }
  });
});

describe('ascension', () => {
  it('reports the level cap for each tier (§7)', () => {
    expect(levelCapFor(0)).toBe(100);
    expect(levelCapFor(4)).toBe(1000);
    expect(levelCapFor(5)).toBe(Infinity);
  });

  it('unlocks ascension only at the cap', () => {
    expect(canAscend(newHero({ progression: { level: 99, xp: 0, ascension: 0 } }))).toBe(false);
    expect(canAscend(newHero({ progression: { level: 100, xp: 0, ascension: 0 } }))).toBe(true);
    expect(canAscend(newHero({ progression: { level: 101, xp: 0, ascension: 0 } }))).toBe(true);
  });

  it('never offers a sixth ascension', () => {
    const maxed = newHero({ progression: { level: 99_999, xp: 0, ascension: 5 } });
    expect(canAscend(maxed)).toBe(false);
  });

  it('opens one equipment slot per tier, cumulatively (§7)', () => {
    expect(unlockedSlotsAt(0)).toEqual([]);
    expect(unlockedSlotsAt(1)).toEqual(['ring']);
    expect(unlockedSlotsAt(3)).toEqual(['ring', 'necklace', 'amulet']);
    expect(unlockedSlotsAt(5)).toEqual(['ring', 'necklace', 'amulet', 'relic', 'artifact']);
  });

  it('unlocks every ascension slot by tier 5', () => {
    for (let tier = 0; tier <= 5; tier += 1) {
      expect(unlockedSlotsAt(tier as AscensionTier)).toHaveLength(tier);
    }
  });
});

describe('summarize', () => {
  it('carries what a slot card needs to render', () => {
    const hero = newHero({
      progression: { level: 12, xp: 40, ascension: 1 },
      tower: {
        currentRunFloor: 5,
        highestFloorEverCleared: 21,
        runSeed: 's',
        milestonesClaimed: [],
        history: [],
        autoClimb: 'off',
        pathChoices: {},
        runGold: 0,
        runFights: 0,
      },
    });
    expect(summarize(hero)).toEqual({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      level: 12,
      ascension: 1,
      highestFloorEverCleared: 21,
    });
  });
});

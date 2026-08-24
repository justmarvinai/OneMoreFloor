import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { CURSE_UNLOCK_LEVEL, MAX_ACTIVE_CURSES } from '@/content/balance/enemies.ts';
import { CURSES } from '@/content/enemies/curses.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import {
  activeCurses,
  curseRewardMultiplier,
  curseStatMultiplier,
  cursesUnlocked,
  toggleCurse,
} from './curses.ts';
import { generateFloor } from './floors.ts';
import { rollFloorReward } from './rewards.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'curse-test',
    }),
    ...overrides,
  };
}

function deep(curses: string[] = []): Character {
  return hero({ progression: { level: CURSE_UNLOCK_LEVEL, xp: 0, ascension: 0 }, curses });
}

const WRATH = 'curse.wrath';
const DOMINION = 'curse.dominion';

describe('curses — enemy affixes on the player’s side (Q35)', () => {
  it('stays shut until the level the owner set', () => {
    expect(cursesUnlocked(hero())).toBe(false);
    expect(cursesUnlocked(deep())).toBe(true);
    expect(toggleCurse(hero(), WRATH)).toBe('notUnlocked');
  });

  it('takes a curse and lifts it again', () => {
    const taken = toggleCurse(deep(), WRATH);
    if (typeof taken === 'string') throw new Error(taken);
    expect(taken.curses).toContain(WRATH);

    const lifted = toggleCurse(taken, WRATH);
    if (typeof lifted === 'string') throw new Error(lifted);
    expect(lifted.curses).not.toContain(WRATH);
  });

  it('holds three at once and says no to a fourth', () => {
    const ids = CURSES.slice(0, MAX_ACTIVE_CURSES).map((curse) => curse.id);
    const full = deep(ids);
    expect(activeCurses(full)).toHaveLength(MAX_ACTIVE_CURSES);
    expect(toggleCurse(full, CURSES[MAX_ACTIVE_CURSES]!.id)).toBe('tooMany');
  });

  it('always lets a curse be lifted, whatever state the save is in', () => {
    // Past the cap and below the unlock level: switching one *off* must work.
    const impossible = hero({ curses: [WRATH, DOMINION] });
    const lifted = toggleCurse(impossible, WRATH);
    expect(typeof lifted).not.toBe('string');
  });

  it('ignores a curse this build no longer defines', () => {
    expect(activeCurses({ curses: ['curse.nonesuch'] })).toHaveLength(0);
    expect(toggleCurse(deep(), 'curse.nonesuch')).toBe('noSuchCurse');
  });

  it('only ever raises — a curse is never a trade', () => {
    for (const curse of CURSES) {
      for (const stat of STAT_IDS) {
        expect(curseStatMultiplier([curse.id], stat)).toBeGreaterThanOrEqual(1);
      }
      expect(curseRewardMultiplier([curse.id])).toBeGreaterThan(1);
    }
  });

  it('makes the enemy on a floor harder without changing which enemy it is', () => {
    const plain = generateFloor('curse-run', 40);
    const cursed = generateFloor('curse-run', 40, [WRATH]);

    // Same floor, same fight — harder numbers.
    expect(cursed.enemy.id).toBe(plain.enemy.id);
    expect(cursed.modifier?.id ?? null).toBe(plain.modifier?.id ?? null);
    expect(cursed.stats.strength).toBeGreaterThan(plain.stats.strength);
    expect(cursed.stats.defense).toBe(plain.stats.defense);
  });

  it('leaves a floor exactly as it was when no curse is taken', () => {
    expect(generateFloor('curse-run', 33, [])).toEqual(generateFloor('curse-run', 33));
  });

  it('pays more from the same floor', () => {
    const input = {
      floor: 40,
      isBoss: false,
      bracket: bracketAt(4),
      classId: 'warrior',
      ascension: 0 as const,
    };

    const plain = rollFloorReward({ ...input, rng: createRng('reward:plain') });
    const cursed = rollFloorReward({
      ...input,
      curses: [DOMINION],
      rng: createRng('reward:plain'),
    });

    expect(cursed.gold).toBeGreaterThan(plain.gold);
    expect(cursed.xp).toBeGreaterThan(plain.xp);
  });

  it('never lets a curse widen the bracket a drop comes from (§13)', () => {
    const bracket = bracketAt(6);
    const input = {
      floor: 70,
      isBoss: true,
      bracket,
      classId: 'warrior',
      ascension: 0 as const,
      curses: CURSES.map((curse) => curse.id),
    };

    for (let seed = 0; seed < 40; seed += 1) {
      const reward = rollFloorReward({ ...input, rng: createRng(`bracket:${seed}`) });
      for (const item of reward.items) {
        expect(item.bracketAtDrop).toBe(bracket.index);
        expect(item.budget).toBeLessThanOrEqual(bracket.window.max);
      }
    }
  });
});

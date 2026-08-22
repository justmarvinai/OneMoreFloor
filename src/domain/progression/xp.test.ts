import { describe, expect, it } from 'vitest';
import {
  createCharacter,
  canAscend,
  levelCapFor,
  unlockedSlotsAt,
} from '../character/character.ts';
import { availableSlots } from '../items/equip.ts';
import type { AscensionTier, Character } from '../character/types.ts';
import { ascendHero, awardXp, levelProgress, xpToNextLevel } from './xp.ts';

function hero(overrides: Partial<Character['progression']> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: 0,
    runSeed: 'xp-test',
  });
  return { ...base, progression: { ...base.progression, ...overrides } };
}

describe('xpToNextLevel', () => {
  it('rises with level', () => {
    expect(xpToNextLevel(10, 0)).toBeGreaterThan(xpToNextLevel(1, 0));
    expect(xpToNextLevel(90, 0)).toBeGreaterThan(xpToNextLevel(10, 0));
  });

  it('steepens with each ascension tier', () => {
    expect(xpToNextLevel(50, 1)).toBeGreaterThan(xpToNextLevel(50, 0));
    expect(xpToNextLevel(50, 5)).toBeGreaterThan(xpToNextLevel(50, 1));
  });
});

describe('awardXp', () => {
  it('banks XP that does not fill the bar', () => {
    const result = awardXp(hero(), 10);
    expect(result.levelsGained).toBe(0);
    expect(result.character.progression.xp).toBe(10);
  });

  it('levels up when the bar fills, carrying the remainder', () => {
    const needed = xpToNextLevel(1, 0);
    const result = awardXp(hero(), needed + 5);

    expect(result.levelsGained).toBe(1);
    expect(result.character.progression.level).toBe(2);
    expect(result.character.progression.xp).toBe(5);
  });

  it('carries a large reward through several levels at once', () => {
    const result = awardXp(hero(), 50_000);
    expect(result.levelsGained).toBeGreaterThan(3);
    expect(result.character.progression.level).toBe(1 + result.levelsGained);
  });

  it('discards XP earned at the cap, making the wall real (A3)', () => {
    const capped = hero({ level: 100, ascension: 0 });
    const result = awardXp(capped, 999_999);

    expect(result.levelsGained).toBe(0);
    expect(result.character.progression.level).toBe(100);
    expect(result.xpWasted).toBe(999_999);
    expect(result.atCap).toBe(true);
  });

  it('stops exactly at the cap when a reward would overshoot it', () => {
    const result = awardXp(hero({ level: 99 }), 10_000_000);
    expect(result.character.progression.level).toBe(100);
    expect(result.xpWasted).toBeGreaterThan(0);
  });

  it('ignores a non-positive award', () => {
    const before = hero();
    expect(awardXp(before, 0).character).toEqual(before);
    expect(awardXp(before, -50).character).toEqual(before);
  });
});

describe('hero ascension (Brief §7)', () => {
  it('refuses before the cap', () => {
    expect(ascendHero(hero({ level: 99 }))).toBeNull();
  });

  it('raises the cap and unlocks a slot', () => {
    const result = ascendHero(hero({ level: 100 }));
    expect(result?.character.progression.ascension).toBe(1);
    expect(result?.unlockedSlot).toBe('ring');
    expect(result?.newLevelCap).toBe(250);
  });

  it('keeps level and XP — the ceiling rises, the climb does not reset', () => {
    const result = ascendHero(hero({ level: 100, xp: 40 }));
    expect(result?.character.progression.level).toBe(100);
    expect(result?.character.progression.xp).toBe(40);
  });

  it('walks 0 → 5 with the caps and slots the brief specifies', () => {
    // M2's exit criterion, as a test: the full ascension ladder.
    const expected = [
      { cap: 250, slot: 'ring' },
      { cap: 500, slot: 'necklace' },
      { cap: 750, slot: 'amulet' },
      { cap: 1000, slot: 'relic' },
      { cap: Infinity, slot: 'artifact' },
    ];

    let character = hero();
    for (const [index, step] of expected.entries()) {
      const tier = index as AscensionTier;
      character = {
        ...character,
        progression: { ...character.progression, level: levelCapFor(tier) },
      };
      expect(canAscend(character), `tier ${tier}`).toBe(true);

      const result = ascendHero(character);
      expect(result?.newLevelCap, `cap after tier ${tier}`).toBe(step.cap);
      expect(result?.unlockedSlot, `slot after tier ${tier}`).toBe(step.slot);
      character = result!.character;
    }

    expect(character.progression.ascension).toBe(5);
    expect(unlockedSlotsAt(5)).toHaveLength(5);
    expect(availableSlots(5)).toHaveLength(14);
    // Ascension 5 is endless: no sixth tier, and no cap to hit.
    expect(
      ascendHero({ ...character, progression: { ...character.progression, level: 99_999 } }),
    ).toBeNull();
  });

  it('never wastes XP at maximum ascension, because there is no cap', () => {
    // Deep levels are enormously expensive, so a million XP banks rather than
    // levelling here — the point is that none of it evaporates, which is what
    // "Endless" means (Brief §7).
    const endless = hero({ level: 5_000, ascension: 5 });
    const result = awardXp(endless, 1_000_000);

    expect(result.xpWasted).toBe(0);
    expect(result.character.progression.xp).toBe(1_000_000);
    expect(result.atCap).toBe(false);
  });

  it('keeps levelling past every earlier cap once fully ascended', () => {
    const endless = hero({ level: 1_000, ascension: 5 });
    const result = awardXp(endless, xpToNextLevel(1_000, 5) * 3);

    expect(result.levelsGained).toBeGreaterThanOrEqual(2);
    expect(result.character.progression.level).toBeGreaterThan(1_000);
    expect(result.xpWasted).toBe(0);
  });
});

describe('levelProgress', () => {
  it('reports the fraction of the way to the next level', () => {
    const needed = xpToNextLevel(1, 0);
    expect(levelProgress(hero({ xp: 0 }))).toBe(0);
    expect(levelProgress(hero({ xp: Math.floor(needed / 2) }))).toBeCloseTo(0.5, 1);
  });

  it('is full at the cap', () => {
    expect(levelProgress(hero({ level: 100, ascension: 0 }))).toBe(1);
  });
});

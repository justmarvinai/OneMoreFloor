import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import {
  AUTO_CLIMB_FLOOR_DELAY_MS,
  BACKGROUND_AUTO_CLIMB_LEVEL,
  autoClimbRefusal,
  canAutoClimb,
  effectiveMode,
} from './autoClimb.ts';

function hero(level: number, mode: Character['tower']['autoClimb'] = 'off'): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: 0,
    runSeed: 'auto',
  });
  return {
    ...base,
    progression: { ...base.progression, level },
    tower: { ...base.tower, autoClimb: mode },
  };
}

describe('auto-climb (Q32)', () => {
  it('is slower than climbing by hand, on purpose', () => {
    // The owner asked for it to be slow, and the pause between floors is where
    // that lives — never in the fight, which Battle Speed owns.
    expect(AUTO_CLIMB_FLOOR_DELAY_MS).toBeGreaterThanOrEqual(15_000);
  });

  it('offers watching from the start and background only deep in', () => {
    expect(canAutoClimb('watching', hero(1))).toBe(true);
    expect(canAutoClimb('background', hero(1))).toBe(false);
    expect(canAutoClimb('background', hero(BACKGROUND_AUTO_CLIMB_LEVEL))).toBe(true);
  });

  it('says why a mode is refused rather than going quietly dead (§20.5)', () => {
    expect(autoClimbRefusal('background', hero(1))).toBe('levelTooLow');
    expect(autoClimbRefusal('background', hero(BACKGROUND_AUTO_CLIMB_LEVEL))).toBeNull();
    expect(autoClimbRefusal('watching', hero(1))).toBeNull();
  });

  it('falls back rather than honouring a mode the hero can no longer choose', () => {
    expect(effectiveMode(hero(1, 'background'))).toBe('watching');
    expect(effectiveMode(hero(BACKGROUND_AUTO_CLIMB_LEVEL, 'background'))).toBe('background');
    expect(effectiveMode(hero(1, 'off'))).toBe('off');
  });
});

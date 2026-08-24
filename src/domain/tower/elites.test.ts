import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { ELITE_CHANCE, ELITE_FROM_FLOOR } from '@/content/balance/enemies.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { generateFloor } from './floors.ts';
import { rollFloorReward } from './rewards.ts';

/** The floors of one run, so a sweep reads the same stream the game would. */
function sweep(seed: string, upTo: number) {
  return Array.from({ length: upTo }, (_, index) => generateFloor(seed, index + 1));
}

describe('elites (Q44)', () => {
  it('never stands on a boss floor', () => {
    for (const floor of sweep('elite-run', 400)) {
      if (floor.isBoss) expect(floor.isElite).toBe(false);
    }
  });

  it('stays out of the opening floors', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      for (let floor = 1; floor < ELITE_FROM_FLOOR; floor += 1) {
        expect(generateFloor(`open:${seed}`, floor).isElite).toBe(false);
      }
    }
  });

  it('turns up about as often as the balance says, and no more', () => {
    let elites = 0;
    let eligible = 0;
    for (let seed = 0; seed < 25; seed += 1) {
      for (const floor of sweep(`rate:${seed}`, 200)) {
        if (floor.isBoss || floor.floor < ELITE_FROM_FLOOR) continue;
        eligible += 1;
        if (floor.isElite) elites += 1;
      }
    }

    const rate = elites / eligible;
    // A wide window: this asserts the dice are wired to the constant, not that
    // a sample of five thousand landed on it exactly.
    expect(rate).toBeGreaterThan(ELITE_CHANCE * 0.6);
    expect(rate).toBeLessThan(ELITE_CHANCE * 1.5);
  });

  it('is the same floor asked twice — the preview cannot lie about it', () => {
    for (let floor = 1; floor <= 120; floor += 1) {
      expect(generateFloor('stable', floor).isElite).toBe(generateFloor('stable', floor).isElite);
    }
  });

  it('carries a modifier even inside the authored range', () => {
    // The whole point: a Frenzied Cutpurse is a fight floor 12 can produce and
    // never could before.
    const elites = sweep('mods', 300).filter((floor) => floor.isElite);
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.every((floor) => floor.modifier !== null)).toBe(true);
  });

  it('stands a head taller than the floors around it', () => {
    /**
     * Compared as a *depth-normalised* pool rather than floor by floor: enemy
     * profiles vary by design (a Spire Rat and a Sump Crawler are not the same
     * size), so one pair proves nothing and the average of hundreds proves the
     * multiplier is wired up.
     */
    const normal: number[] = [];
    const elite: number[] = [];

    for (let seed = 0; seed < 20; seed += 1) {
      for (const floor of sweep(`taller:${seed}`, 200)) {
        if (floor.isBoss || floor.floor < ELITE_FROM_FLOOR) continue;
        // Divided by the floor's own power so shallow and deep pool together.
        const normalised = floor.stats.hp / floor.floor;
        (floor.isElite ? elite : normal).push(normalised);
      }
    }

    expect(elite.length).toBeGreaterThan(50);
    const mean = (values: number[]): number =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(mean(elite)).toBeGreaterThan(mean(normal) * 1.4);
  });

  it('always leaves gear and materials behind', () => {
    const input = {
      floor: 40,
      isBoss: false,
      isElite: true,
      bracket: bracketAt(4),
      classId: 'warrior',
      ascension: 0 as const,
    };

    for (let seed = 0; seed < 20; seed += 1) {
      const reward = rollFloorReward({ ...input, rng: createRng(`elite:${seed}`) });
      expect(reward.items.length).toBeGreaterThan(0);
      expect(Object.values(reward.materials).some((count) => count > 0)).toBe(true);
    }
  });

  it('pays more than the floor it stands on, and still inside the bracket (§13)', () => {
    const bracket = bracketAt(4);
    const base = {
      floor: 40,
      isBoss: false,
      bracket,
      classId: 'warrior',
      ascension: 0 as const,
    };

    const plain = rollFloorReward({ ...base, rng: createRng('pay') });
    const elite = rollFloorReward({ ...base, isElite: true, rng: createRng('pay') });

    expect(elite.gold).toBeGreaterThan(plain.gold);
    expect(elite.xp).toBeGreaterThan(plain.xp);
    for (const item of elite.items) {
      expect(item.bracketAtDrop).toBe(bracket.index);
      expect(item.budget).toBeLessThanOrEqual(bracket.window.max);
    }
  });
});

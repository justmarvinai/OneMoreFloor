import { describe, expect, it } from 'vitest';
import { ARCHETYPES, simulate, simulateAllClasses } from './simulate.ts';

/**
 * The simulator's own smoke tests — that the harness runs end to end over the
 * real engine. The *balance* assertions live in `gates.test.ts`.
 */
describe('balance simulator', () => {
  it('plays sessions and reports what happened', () => {
    const report = simulate({
      classId: 'warrior',
      archetype: ARCHETYPES.climberNoShop!,
      sessions: 2,
      seed: 'smoke',
    });

    expect(report.sessions).toHaveLength(2);
    expect(report.totalFights).toBeGreaterThan(0);
    // A level-1 hero must not be able to climb forever, or there is no game.
    expect(report.firstDeathFloor).toBeGreaterThan(0);
    expect(report.bestFloor).toBeGreaterThan(0);
  });

  it('gets further in a later session than the first — the loop works (Brief §1)', () => {
    const report = simulate({
      classId: 'hunter',
      archetype: ARCHETYPES.shopEveryRestock!,
      sessions: 4,
      seed: 'progress',
    });
    expect(report.sessions.at(-1)!.bestFloor).toBeGreaterThan(report.sessions[0]!.bestFloor);
  });

  it('runs every class through every archetype without breaking', () => {
    for (const archetype of Object.values(ARCHETYPES)) {
      const reports = simulateAllClasses(archetype, 2, `all:${archetype.id}`);
      expect(reports).toHaveLength(5);
      for (const report of reports) {
        expect(report.bestFloor, `${archetype.id}/${report.classId}`).toBeGreaterThan(0);
        expect(Number.isFinite(report.finalPower), report.classId).toBe(true);
      }
    }
  });
});

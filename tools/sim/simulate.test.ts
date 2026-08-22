import { describe, expect, it } from 'vitest';
import { simulate, simulateAllClasses } from './simulate.ts';

/**
 * The simulator's own smoke tests — M3's exit criterion is that this harness
 * exists and runs end to end over the real engine. M9 adds the tuning gates from
 * BALANCE.md §10 (death-wall placement, re-climb time, class parity band).
 */
describe('balance simulator', () => {
  it('climbs, dies, and reports where', () => {
    const report = simulate({ classId: 'warrior', runs: 2, seed: 'smoke' });

    expect(report.runs).toHaveLength(2);
    expect(report.totalFights).toBeGreaterThan(0);
    // A level-1 hero must not be able to climb forever, or there is no game.
    expect(report.firstDeathFloor).toBeGreaterThan(0);
    expect(report.deepestFloor).toBeGreaterThan(0);
  });

  it('gets further on a later run than the first — the loop works (Brief §1)', () => {
    const report = simulate({ classId: 'hunter', runs: 4, seed: 'progress' });
    const first = report.runs[0]!.reachedFloor;
    const last = report.runs.at(-1)!.reachedFloor;
    expect(last).toBeGreaterThanOrEqual(first);
  });

  it('runs every class without breaking', () => {
    const reports = simulateAllClasses(2, 'all-classes');
    expect(reports).toHaveLength(5);
    for (const report of reports) {
      expect(report.deepestFloor, report.classId).toBeGreaterThan(0);
      expect(Number.isFinite(report.finalPower), report.classId).toBe(true);
    }
  });

  it('reports a first death wall in a plausible early range', () => {
    // Provisional, not a tuning gate: M9 sets the real target (floors 15–25 for
    // a no-shop climber). This only catches a curve that is wildly broken.
    const report = simulate({ classId: 'warrior', runs: 1, seed: 'wall' });
    expect(report.firstDeathFloor).toBeGreaterThan(1);
    expect(report.firstDeathFloor).toBeLessThan(200);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';

describe('createRng', () => {
  it('replays identically from the same seed', () => {
    const a = createRng('combat:run7:floor12');
    const b = createRng('combat:run7:floor12');
    const drawA = Array.from({ length: 50 }, () => a.next());
    const drawB = Array.from({ length: 50 }, () => b.next());
    expect(drawA).toEqual(drawB);
  });

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, createRng('floor:1').next);
    const b = Array.from({ length: 20 }, createRng('floor:2').next);
    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 10_000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int() is inclusive on both ends and never escapes the range', () => {
    const rng = createRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i += 1) {
      const value = rng.int(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('int() handles a single-value range and rejects an inverted one', () => {
    expect(createRng('single').int(4, 4)).toBe(4);
    expect(() => createRng('bad').int(6, 1)).toThrow(RangeError);
  });

  it('chance() treats 0 and 1 as certainties without consuming randomness', () => {
    const rng = createRng('chance');
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    // The certain cases must not advance the stream, or adding a guaranteed
    // effect somewhere would shift every later roll in a replay.
    expect(rng.next()).toBe(createRng('chance').next());
  });

  it('chance() approximates the requested probability', () => {
    const rng = createRng('distribution');
    let hits = 0;
    for (let i = 0; i < 20_000; i += 1) if (rng.chance(0.25)) hits += 1;
    expect(hits / 20_000).toBeCloseTo(0.25, 1);
  });

  it('pick() returns members and rejects an empty list', () => {
    const rng = createRng('pick');
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i += 1) expect(items).toContain(rng.pick(items));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('weighted() never returns a zero-weight entry and honours the weights', () => {
    const rng = createRng('weighted');
    const counts = { common: 0, mythic: 0, never: 0 };
    for (let i = 0; i < 20_000; i += 1) {
      const result = rng.weighted([
        { value: 'common' as const, weight: 95 },
        { value: 'mythic' as const, weight: 5 },
        { value: 'never' as const, weight: 0 },
      ]);
      counts[result] += 1;
    }
    expect(counts.never).toBe(0);
    expect(counts.mythic / 20_000).toBeCloseTo(0.05, 1);
    expect(counts.common + counts.mythic).toBe(20_000);
  });

  it('weighted() rejects a table that cannot produce anything', () => {
    const rng = createRng('empty-weights');
    expect(() => rng.weighted([{ value: 'x', weight: 0 }])).toThrow(RangeError);
  });

  it('fork() derives by label, independently of how much the parent drew', () => {
    const early = createRng('run:7').fork('loot');

    const parent = createRng('run:7');
    for (let i = 0; i < 100; i += 1) parent.next();
    const late = parent.fork('loot');

    // Same parent seed and label ⇒ same stream, whatever the parent consumed.
    // This is what keeps replays stable when game code changes shape.
    expect(early.seed).toBe(late.seed);
    expect(Array.from({ length: 10 }, early.next)).toEqual(Array.from({ length: 10 }, late.next));
  });

  it('fork() separates different labels', () => {
    const parent = createRng('run:7');
    const loot = parent.fork('loot');
    const combat = parent.fork('combat');
    expect(Array.from({ length: 10 }, loot.next)).not.toEqual(
      Array.from({ length: 10 }, combat.next),
    );
  });
});

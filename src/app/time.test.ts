import { describe, expect, it } from 'vitest';
import { createClock, dayKeyOf, weekKeyOf } from './time.ts';

/** Local-midnight timestamp, so tests read the same in any timezone. */
function local(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime();
}

describe('createClock', () => {
  it('reports the source time when it moves forward', () => {
    let source = 1_000;
    const clock = createClock({ source: () => source });
    expect(clock.now()).toBe(1_000);
    source = 5_000;
    expect(clock.now()).toBe(5_000);
    expect(clock.rollbackDetected()).toBe(false);
  });

  it('damps a backwards jump to the high-water mark', () => {
    let source = 10_000;
    const clock = createClock({ source: () => source });
    expect(clock.now()).toBe(10_000);

    source = 1_000; // player winds the clock back
    expect(clock.now()).toBe(10_000);
    expect(clock.rollbackDetected()).toBe(true);

    // Time stays still until the real clock catches up with itself, so a buff
    // can never be frozen and a finished quest day can never re-open.
    source = 9_999;
    expect(clock.now()).toBe(10_000);
    source = 10_500;
    expect(clock.now()).toBe(10_500);
  });

  it('resumes from a persisted high-water mark across a boot', () => {
    const clock = createClock({ source: () => 500, lastKnown: 10_000 });
    expect(clock.now()).toBe(10_000);
    expect(clock.highWaterMark()).toBe(10_000);
  });

  it('exposes the mark the save layer persists', () => {
    let source = 42;
    const clock = createClock({ source: () => source });
    clock.now();
    source = 99;
    clock.now();
    expect(clock.highWaterMark()).toBe(99);
  });
});

describe('period keys', () => {
  it('dayKey rolls at local midnight', () => {
    const clock = createClock({ source: () => local(2026, 8, 22, 23) });
    expect(clock.dayKey()).toBe('2026-08-22');
    expect(dayKeyOf(local(2026, 8, 23, 0))).toBe('2026-08-23');
  });

  it('dayKey pads single-digit months and days', () => {
    expect(dayKeyOf(local(2026, 1, 5))).toBe('2026-01-05');
  });

  it('weekKey holds across a week and rolls on Monday', () => {
    // 2026-08-22 is a Saturday; 2026-08-24 is the following Monday.
    const saturday = weekKeyOf(local(2026, 8, 22));
    const sunday = weekKeyOf(local(2026, 8, 23));
    const monday = weekKeyOf(local(2026, 8, 24));
    expect(sunday).toBe(saturday);
    expect(monday).not.toBe(saturday);
  });

  it('weekKey uses ISO week numbering around a year boundary', () => {
    // 2026-01-01 is a Thursday, so it belongs to ISO week 1 of 2026, and the
    // Monday before it (2025-12-29) belongs to that same week.
    expect(weekKeyOf(local(2026, 1, 1))).toBe('2026-W01');
    expect(weekKeyOf(local(2025, 12, 29))).toBe('2026-W01');
    expect(weekKeyOf(local(2025, 12, 28))).not.toBe('2026-W01');
  });
});

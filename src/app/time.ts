/**
 * The clock service.
 *
 * Every wall-clock read in the game goes through here; `Date.now()` is banned
 * elsewhere by lint. Centralising it buys two things the save layer needs:
 *
 *  - **Tamper damping** (SAVE_SCHEMA §7). There is no server (Brief §21), so the
 *    clock is the player's to move. Moving it *backwards* must not freeze potion
 *    buffs forever or re-open a finished quest day, so `now()` never reports a
 *    time earlier than the last one we persisted. Moving it *forwards* is honored:
 *    it only burns the player's own buffs and skips their own quest days.
 *  - **Testability.** The source is injectable, so time-dependent behaviour is
 *    tested by advancing a number instead of waiting.
 *
 * Period keys are local-time based per the Q10 decision: dailies roll at local
 * midnight, weeklies at local Monday 00:00.
 */

export interface Clock {
  /** Current wall-clock time in epoch milliseconds, damped against rollback. */
  now(): number;
  /** Local day key, `YYYY-MM-DD` — the daily quest period (Q10). */
  dayKey(): string;
  /** Local ISO week key, `YYYY-Www` — the weekly quest period (Q10). */
  weekKey(): string;
  /**
   * The high-water mark to persist. The save layer writes this and hands it back
   * on the next boot via `createClock({ lastKnown })`.
   */
  highWaterMark(): number;
  /** True once a backwards jump has been observed and damped this session. */
  rollbackDetected(): boolean;
}

export interface ClockOptions {
  /** Raw time source. Defaults to the system clock. */
  source?: () => number;
  /** Last persisted `highWaterMark()` from the save, if any. */
  lastKnown?: number;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local `YYYY-MM-DD` for a timestamp. */
export function dayKeyOf(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Local ISO-8601 week key, `YYYY-Www`, with weeks starting Monday — which is what
 * makes "resets Monday 00:00 local" (Q10) a single string comparison.
 */
export function weekKeyOf(timestamp: number): string {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  // Shift to the Thursday of this week: ISO week years are defined by which year
  // that Thursday falls in, which is what makes year boundaries come out right.
  const isoDayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - isoDayOfWeek + 3);
  const isoYear = date.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  firstThursday.setHours(0, 0, 0, 0);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${pad2(week)}`;
}

export function createClock(options: ClockOptions = {}): Clock {
  const source = options.source ?? (() => Date.now());
  let mark = options.lastKnown ?? 0;
  let rolledBack = false;

  const now = (): number => {
    const raw = source();
    if (raw < mark) {
      // Clock moved backwards: report the high-water mark instead. Time stands
      // still for this player until their clock catches up with itself.
      rolledBack = true;
      return mark;
    }
    mark = raw;
    return raw;
  };

  return {
    now,
    dayKey: () => dayKeyOf(now()),
    weekKey: () => weekKeyOf(now()),
    highWaterMark: () => mark,
    rollbackDetected: () => rolledBack,
  };
}

/**
 * The clock the running game uses. `main.ts` replaces it during boot with one
 * hydrated from the save's high-water mark.
 */
let current: Clock = createClock();

export function setClock(clock: Clock): void {
  current = clock;
}

export function clock(): Clock {
  return current;
}

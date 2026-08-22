/**
 * One writer at a time (SAVE_SCHEMA §8).
 *
 * Two tabs on the same save race each other's writes, and the loser's progress
 * quietly disappears. The Web Locks API settles it: the first tab holds an
 * exclusive lock for its whole session, and a second tab is told the game is
 * already open rather than being allowed to fight over the record.
 *
 * The same guard covers a second Electron instance later (ARCHITECTURE §6).
 */

/** The slice of the Web Locks API we use, injectable so tests can drive it. */
export interface LockManagerLike {
  request(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
    callback: (lock: unknown | null) => Promise<unknown>,
  ): Promise<unknown>;
}

export interface SessionLock {
  /** Whether this session actually holds the lock. */
  readonly held: boolean;
  /** Release it. Safe to call more than once. */
  release(): void;
}

export const SESSION_LOCK_NAME = 'onemorefloor:save';

function lockManager(): LockManagerLike | null {
  const locks = (globalThis.navigator as (Navigator & { locks?: LockManagerLike }) | undefined)
    ?.locks;
  return locks ?? null;
}

/**
 * Try to take the session lock.
 *
 * Returns a lock whose `held` is false when another tab already has it — the
 * caller then shows the "already open" gate instead of touching the save.
 *
 * Where the Web Locks API is unavailable, this reports the lock as held: a
 * browser without it gives us nothing to coordinate through, and refusing to
 * start would be worse than the race we cannot detect.
 */
export async function acquireSessionLock(
  manager: LockManagerLike | null = lockManager(),
  name: string = SESSION_LOCK_NAME,
): Promise<SessionLock> {
  if (!manager) return { held: true, release: () => {} };

  let release = (): void => {};
  const untilReleased = new Promise<void>((resolve) => {
    release = resolve;
  });

  const granted = await new Promise<boolean>((resolve, reject) => {
    manager
      .request(name, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        resolve(true);
        // Holding the lock means keeping this callback's promise pending; it
        // settles when `release()` is called, which is what frees the lock.
        await untilReleased;
      })
      .catch(reject);
  });

  if (!granted) return { held: false, release: () => {} };

  let released = false;
  return {
    held: true,
    release: () => {
      if (released) return;
      released = true;
      release();
    },
  };
}

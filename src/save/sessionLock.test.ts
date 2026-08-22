import { describe, expect, it } from 'vitest';
import { acquireSessionLock, type LockManagerLike } from './sessionLock.ts';

/** A stand-in for the Web Locks API: one holder at a time, per name. */
function fakeLockManager(): LockManagerLike & { heldNames(): string[] } {
  const held = new Set<string>();

  return {
    heldNames: () => [...held],
    async request(name, options, callback) {
      if (held.has(name)) {
        if (options.ifAvailable) return callback(null);
        throw new Error('would deadlock in this fake');
      }
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

describe('acquireSessionLock', () => {
  it('grants the lock to the first caller', async () => {
    const manager = fakeLockManager();
    const lock = await acquireSessionLock(manager, 'test');

    expect(lock.held).toBe(true);
    expect(manager.heldNames()).toEqual(['test']);
  });

  it('refuses a second holder while the first is still running', async () => {
    const manager = fakeLockManager();
    const first = await acquireSessionLock(manager, 'test');
    const second = await acquireSessionLock(manager, 'test');

    expect(first.held).toBe(true);
    expect(second.held).toBe(false);
  });

  it('frees the lock on release, so a reload can take it again', async () => {
    const manager = fakeLockManager();
    const first = await acquireSessionLock(manager, 'test');

    first.release();
    // Releasing resolves the promise the holder is parked on; the lock is freed
    // once that continuation runs, which is a turn of the event loop away.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(manager.heldNames()).toEqual([]);

    const second = await acquireSessionLock(manager, 'test');
    expect(second.held).toBe(true);
  });

  it('tolerates release being called more than once', async () => {
    const lock = await acquireSessionLock(fakeLockManager(), 'test');
    lock.release();
    expect(() => lock.release()).not.toThrow();
  });

  it('keeps different names independent', async () => {
    const manager = fakeLockManager();
    const a = await acquireSessionLock(manager, 'a');
    const b = await acquireSessionLock(manager, 'b');
    expect(a.held && b.held).toBe(true);
  });

  it('reports the lock as held where the Web Locks API is unavailable', async () => {
    // Nothing to coordinate through: refusing to start would be worse than the
    // race we cannot detect.
    const lock = await acquireSessionLock(null, 'test');
    expect(lock.held).toBe(true);
    expect(() => lock.release()).not.toThrow();
  });
});

/**
 * **Save torture** (SAVE_SCHEMA §11, ROADMAP M10).
 *
 * The layer's other tests prove it does the right thing when nothing goes wrong.
 * This one proves it does the right thing when everything does: the tab is
 * killed, the disk quota runs out, or IndexedDB simply refuses — at every point
 * in the write, one operation at a time.
 *
 * The promise being defended is the one a player actually cares about: **a save
 * is never half-written.** Either the action happened or it did not; there is no
 * state where a character has the new gold and the old gear.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createClock, setClock } from '@/app/time.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import { openDatabase } from './db.ts';
import type { SaveDatabase } from './db.ts';
import { createSaveLayer } from './saveLayer.ts';

const NOW = 1_700_000_000_000;

function hero(gold: number, slotId: 1 | 2 = 1): Character {
  const base = createCharacter({
    slotId,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: NOW,
    runSeed: 'torture',
  });
  return { ...base, currencies: { ...base.currencies, gold } };
}

const ACCOUNT: Account = {
  slotsUnlocked: 1,
  battleSpeedTier: 0,
  activeSlotId: 1,
  tutorialCompleted: true,
  backpackSlots: 20,
  bestiary: {},
};

/** Thrown by the injected fault, so a real bug cannot masquerade as one. */
class InjectedFault extends Error {}

/**
 * Wrap a database so the `n`-th store operation of a write throws.
 *
 * Only the transaction path is wrapped: reads outside a transaction are not where
 * a half-write could come from, and leaving them alone keeps the harness honest
 * about *what* it broke.
 */
function faultAfter(db: SaveDatabase, n: number): SaveDatabase {
  let operations = 0;

  const wrapStore = (store: unknown): unknown =>
    new Proxy(store as object, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== 'function') return value;
        if (!['put', 'get', 'delete', 'getAllKeys'].includes(String(property))) {
          return (value as (...args: unknown[]) => unknown).bind(target);
        }
        return (...args: unknown[]) => {
          operations += 1;
          if (operations === n) throw new InjectedFault(`fault at operation ${n}`);
          return (value as (...args: unknown[]) => unknown).apply(target, args);
        };
      },
    });

  return new Proxy(db as object, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property !== 'transaction') {
        return typeof value === 'function' ? (value as () => unknown).bind(target) : value;
      }
      return (...args: unknown[]) => {
        const tx = (value as (...a: unknown[]) => unknown).apply(target, args) as {
          objectStore: (name: string) => unknown;
          done: Promise<unknown>;
        };
        // A transaction that is going to be aborted still settles `done` as a
        // rejection; swallowing it here keeps the harness from failing on the
        // unhandled rejection rather than on the assertion it is making.
        void tx.done.catch(() => undefined);
        return new Proxy(tx, {
          get(txTarget, txProperty, txReceiver) {
            if (txProperty === 'objectStore') {
              return (name: string) => wrapStore(txTarget.objectStore(name));
            }
            const inner = Reflect.get(txTarget, txProperty, txReceiver);
            return typeof inner === 'function' ? (inner as () => unknown).bind(txTarget) : inner;
          },
        });
      };
    },
  }) as SaveDatabase;
}

async function freshDatabase(): Promise<SaveDatabase> {
  return openDatabase(`omf-torture-${Math.random().toString(36).slice(2)}`);
}

describe('save torture: a crash at every point in the write', () => {
  beforeEach(() => setClock(createClock({ source: () => NOW })));

  it('never leaves a half-written character behind', async () => {
    // The whole point of one-action-one-transaction (SAVE_SCHEMA §5): a fault
    // anywhere inside it must leave the previous state, not a blend.
    let faultsFired = 0;
    for (let fault = 1; fault <= 24; fault += 1) {
      const db = await freshDatabase();
      const save = createSaveLayer(db);
      await save.createCharacter(hero(100), ACCOUNT);

      const broken = createSaveLayer(faultAfter(db, fault));
      let threw = false;
      try {
        await broken.saveCharacter(hero(999));
      } catch (error) {
        threw = error instanceof InjectedFault;
        if (threw) faultsFired += 1;
      }

      // Reopen through a clean layer: what does the player find next launch?
      const reopened = createSaveLayer(db);
      const loaded = await reopened.loadCharacter(1);

      expect(loaded.status, `fault ${fault}`).not.toBe('corrupt');
      expect(loaded.record, `fault ${fault}`).not.toBeNull();
      // Either the write landed whole or it did not land at all.
      expect(
        [100, 999],
        `fault ${fault} left gold ${loaded.record?.character.currencies.gold}`,
      ).toContain(loaded.record!.character.currencies.gold);
      if (!threw) {
        expect(loaded.record!.character.currencies.gold, `fault ${fault}`).toBe(999);
      }

      db.close();
    }

    // A harness that stopped injecting would pass this test in silence, which is
    // exactly the failure mode a torture test cannot afford. A save is a handful
    // of store operations — read the old record, back it up, prune, write — and
    // the sweep runs past the end of them on purpose, so the count below is how
    // many actually exist rather than how many were attempted.
    expect(faultsFired, 'no injected fault ever fired').toBeGreaterThanOrEqual(4);
  });

  it('never leaves an account pointing at a character that was not created', async () => {
    // `createCharacter` writes the hero and the account together on purpose: a
    // fault between them would strand the account on an empty slot, which is
    // the one inconsistency a player would actually notice on next launch.
    for (let fault = 1; fault <= 20; fault += 1) {
      const db = await freshDatabase();
      const save = createSaveLayer(db);
      await save.saveAccount({ ...ACCOUNT, activeSlotId: 1 });

      const broken = createSaveLayer(faultAfter(db, fault));
      try {
        await broken.createCharacter(hero(50, 2), { ...ACCOUNT, activeSlotId: 2 });
      } catch {
        // Expected for most fault points.
      }

      const reopened = createSaveLayer(db);
      const account = await reopened.loadAccount();
      const slot2 = await reopened.loadCharacter(2);

      const pointsAtSlot2 = account.record?.account.activeSlotId === 2;
      const slot2Exists = slot2.record !== null;
      expect(
        pointsAtSlot2 === slot2Exists,
        `fault ${fault}: account says slot ${account.record?.account.activeSlotId}, slot 2 is ${slot2.status}`,
      ).toBe(true);

      db.close();
    }
  });

  it('keeps a recoverable copy even when the live write fails', async () => {
    // Belt and braces: after a failed write the backups must still hold the
    // record, so the recovery ladder has something to walk (SAVE_SCHEMA §6).
    const db = await freshDatabase();
    const save = createSaveLayer(db);
    await save.createCharacter(hero(100), ACCOUNT);
    await save.saveCharacter(hero(200));

    const broken = createSaveLayer(faultAfter(db, 6));
    await broken.saveCharacter(hero(300)).catch(() => undefined);

    // Corrupt the live record outright and make the ladder do its job.
    const stored = await db.get('characters', 'slot-1');
    await db.put('characters', { ...stored!, character: 'not an object' }, 'slot-1');

    const recovered = await createSaveLayer(db).loadCharacter(1);
    expect(recovered.status).toBe('recovered');
    expect([100, 200, 300]).toContain(recovered.record!.character.currencies.gold);

    db.close();
  });
});

describe('clock rollback (SAVE_SCHEMA §7)', () => {
  it('does not let a wound-back clock hand out extra buff time', async () => {
    // The clock is damped against rollback at the service level, so the whole
    // game — potions, quest periods, merchant restocks — inherits the guarantee
    // from one place rather than each re-implementing it.
    const forward = createClock({ source: () => NOW + 60_000, lastKnown: NOW });
    expect(forward.now()).toBe(NOW + 60_000);
    expect(forward.rollbackDetected()).toBe(false);

    const backward = createClock({ source: () => NOW - 6 * 3_600_000, lastKnown: NOW });
    // Damped to the high-water mark: an hour-long draught cannot be refreshed by
    // winding the system clock back an hour, and a quest board cannot be re-rolled.
    expect(backward.now()).toBe(NOW);
    expect(backward.rollbackDetected()).toBe(true);
    // And time stays still until the real clock catches up, rather than jumping.
    expect(backward.now()).toBe(NOW);
    expect(backward.highWaterMark()).toBe(NOW);
  });
});

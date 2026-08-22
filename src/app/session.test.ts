import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type SaveDatabase } from '@/save/db.ts';
import { createSaveLayer, type SaveLayer } from '@/save/saveLayer.ts';
import { STORES, characterKey, type StoredRecord } from '@/save/schema.ts';
import { createSession, type Session } from './session.ts';
import { createAppStore, type AppStore } from './state.ts';
import { createClock, setClock } from './time.ts';

/**
 * The create → play → switch → reset cycle, which is M1's exit criterion.
 * These run against the real save layer on a fake IndexedDB, so what is tested
 * is the same path the game takes.
 */
let db: SaveDatabase;
let save: SaveLayer;
let store: AppStore;
let session: Session;
let time: number;

beforeEach(async () => {
  time = 1_700_000_000_000;
  setClock(createClock({ source: () => time }));
  db = await openDatabase(`omf-session-${Math.random().toString(36).slice(2)}`);
  save = createSaveLayer(db);
  store = createAppStore();
  session = createSession(save, store);
  await session.refresh();
});

afterEach(() => {
  db.close();
  setClock(createClock());
});

describe('refresh', () => {
  it('creates an account on a first run and reports one open slot', () => {
    const state = store.get();
    expect(state.account?.slotsUnlocked).toBe(1);
    expect(state.slots.map((slot) => slot.state)).toEqual([
      'empty',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
  });
});

describe('createHero', () => {
  it('creates a hero, fills the slot and enters the game', async () => {
    const result = await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });

    expect(result).toEqual({ ok: true });
    const state = store.get();
    expect(state.activeCharacter?.identity.name).toBe('Grimhild');
    expect(state.slots[0].state).toBe('occupied');
    expect(state.slots[0].summary?.level).toBe(1);
    expect(state.account?.activeSlotId).toBe(1);
  });

  it('persists the hero, so a fresh session finds them', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'mage' });

    const reread = createSession(createSaveLayer(db), createAppStore());
    await reread.refresh();
    const entered = await reread.play(1);

    expect(entered).toBe(true);
  });

  it('refuses a name already used by another of this player’s heroes (Q25)', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    store.update((state) => ({
      ...state,
      slots: state.slots.map((slot) =>
        slot.slotId === 2 ? { ...slot, state: 'empty' as const } : slot,
      ),
      account: state.account ? { ...state.account, slotsUnlocked: 2 } : state.account,
    }));

    const result = await session.createHero({ slotId: 2, name: 'grimhild', classId: 'mage' });

    expect(result).toEqual({ ok: false, problem: 'duplicate' });
  });

  it('refuses an invalid name without writing anything', async () => {
    const result = await session.createHero({ slotId: 1, name: 'x', classId: 'warrior' });

    expect(result).toEqual({ ok: false, problem: 'tooShort' });
    expect((await save.loadCharacter(1)).status).toBe('absent');
  });

  it('refuses a locked slot', async () => {
    const result = await session.createHero({ slotId: 4, name: 'Rowan', classId: 'bard' });
    expect(result).toEqual({ ok: false, problem: 'slotUnavailable' });
  });

  it('refuses a slot that already holds a hero', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    const result = await session.createHero({ slotId: 1, name: 'Rowan', classId: 'bard' });
    expect(result).toEqual({ ok: false, problem: 'slotUnavailable' });
  });

  it('gives each hero their own tower seed', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    const first = store.get().activeCharacter?.tower.runSeed;

    await session.leave();
    store.update((state) => ({
      ...state,
      account: state.account ? { ...state.account, slotsUnlocked: 2 } : state.account,
      slots: state.slots.map((slot) =>
        slot.slotId === 2 ? { ...slot, state: 'empty' as const } : slot,
      ),
    }));
    await session.createHero({ slotId: 2, name: 'Rowan', classId: 'bard' });

    expect(store.get().activeCharacter?.tower.runSeed).not.toBe(first);
  });
});

describe('play and leave', () => {
  it('switches between heroes one at a time (Q2)', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    await session.leave();

    expect(store.get().activeCharacter).toBeNull();
    expect(store.get().account?.activeSlotId).toBeNull();

    expect(await session.play(1)).toBe(true);
    expect(store.get().activeCharacter?.identity.name).toBe('Grimhild');
    expect(store.get().account?.activeSlotId).toBe(1);
  });

  it('reports failure and marks the slot damaged when a hero cannot be read', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    await session.leave();

    // Destroy both the live record and every backup of it.
    await db.put(STORES.characters, { broken: true } as StoredRecord, characterKey(1));
    for (const key of await db.getAllKeys(STORES.saveBackups)) {
      if (String(key).includes('characters:slot-1')) await db.delete(STORES.saveBackups, key);
    }

    expect(await session.play(1)).toBe(false);
    expect(store.get().slots[0].state).toBe('damaged');
    expect(store.get().activeCharacter).toBeNull();
  });
});

describe('reset', () => {
  it('erases the character but keeps account upgrades (Brief §19, Q4)', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    store.update((state) => ({
      ...state,
      account: state.account ? { ...state.account, battleSpeedTier: 2, slotsUnlocked: 3 } : null,
    }));

    await session.reset(1);

    const state = store.get();
    expect(state.activeCharacter).toBeNull();
    expect(state.slots[0].state).toBe('empty');
    expect(state.account?.battleSpeedTier).toBe(2);
    expect(state.account?.slotsUnlocked).toBe(3);
    expect(state.account?.activeSlotId).toBeNull();
  });

  it('frees the name for reuse', async () => {
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    await session.reset(1);

    expect(await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'mage' })).toEqual({
      ok: true,
    });
    expect(store.get().activeCharacter?.identity.classId).toBe('mage');
  });

  it('leaves other slots untouched', async () => {
    store.update((state) => ({
      ...state,
      account: state.account ? { ...state.account, slotsUnlocked: 2 } : null,
      slots: state.slots.map((slot) =>
        slot.slotId === 2 ? { ...slot, state: 'empty' as const } : slot,
      ),
    }));
    await session.createHero({ slotId: 1, name: 'Grimhild', classId: 'warrior' });
    await session.leave();
    await session.createHero({ slotId: 2, name: 'Rowan', classId: 'bard' });

    await session.reset(1);

    expect(store.get().slots[1].summary?.name).toBe('Rowan');
  });
});

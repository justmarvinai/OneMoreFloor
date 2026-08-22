import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClock, setClock } from '@/app/time.ts';
import { openDatabase, type SaveDatabase } from './db.ts';
import { stamp } from './integrity.ts';
import { createSaveLayer, openSave } from './saveLayer.ts';
import { CURRENT_SCHEMA_VERSION, META_KEY, STORES, type StoredRecord } from './schema.ts';

let dbName: string;
let db: SaveDatabase;
let time: number;

beforeEach(async () => {
  // A distinct database per test keeps them independent inside one fake-indexeddb.
  dbName = `omf-test-${Math.random().toString(36).slice(2)}`;
  time = 1_700_000_000_000;
  setClock(createClock({ source: () => time }));
  db = await openDatabase(dbName);
});

afterEach(() => {
  db.close();
  setClock(createClock());
});

describe('createSaveLayer', () => {
  it('creates a meta record on a first run', async () => {
    const save = createSaveLayer(db);
    const result = await save.loadMeta();

    expect(result.status).toBe('created');
    expect(result.record.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.record.createdAt).toBe(time);
    expect(result.record.integrity.gen).toBe(1);
  });

  it('round-trips a record through IndexedDB', async () => {
    const save = createSaveLayer(db);
    const created = await save.loadMeta();

    time += 60_000;
    await save.saveMeta({ ...created.record, lastKnownWallClock: time });

    const reloaded = await save.loadMeta();
    expect(reloaded.status).toBe('loaded');
    expect(reloaded.record.lastKnownWallClock).toBe(time);
    expect(reloaded.record.createdAt).toBe(created.record.createdAt);
  });

  it('increments the generation counter on every write', async () => {
    const save = createSaveLayer(db);
    const created = await save.loadMeta();
    expect(created.record.integrity.gen).toBe(1);

    const second = await save.saveMeta(created.record);
    expect(second.integrity.gen).toBe(2);

    const third = await save.saveMeta(second);
    expect(third.integrity.gen).toBe(3);
  });

  it('detects a corrupted record instead of loading it', async () => {
    const save = createSaveLayer(db);
    const created = await save.loadMeta();

    // Simulate disk corruption: a field changes without the checksum following.
    await db.put(
      STORES.meta,
      { ...(created.record as unknown as StoredRecord), lastOpenedAt: 999 },
      META_KEY,
    );

    const result = await save.loadMeta();
    expect(result.status).toBe('corrupt');
  });

  it('leaves a corrupted blob on disk for the recovery ladder', async () => {
    const save = createSaveLayer(db);
    const created = await save.loadMeta();
    const damaged = { ...(created.record as unknown as StoredRecord), lastOpenedAt: 999 };
    await db.put(STORES.meta, damaged, META_KEY);

    await save.loadMeta();

    // Player data is never silently overwritten (SAVE_SCHEMA §6).
    const stillThere = (await db.get(STORES.meta, META_KEY)) as StoredRecord;
    expect(stillThere['lastOpenedAt']).toBe(999);
  });

  it('rejects a save written by a newer build', async () => {
    const future = stamp(
      {
        schemaVersion: CURRENT_SCHEMA_VERSION + 1,
        createdAt: time,
        lastOpenedAt: time,
        lastKnownWallClock: time,
      },
      { writtenAt: time, gen: 1 },
    );
    await db.put(STORES.meta, future as unknown as StoredRecord, META_KEY);

    const save = createSaveLayer(db);
    await expect(save.loadMeta()).rejects.toThrow(/newer version of the game/);
  });

  it('treats a verified but structurally wrong record as corrupt', async () => {
    const nonsense = stamp(
      { schemaVersion: CURRENT_SCHEMA_VERSION, wat: true },
      {
        writtenAt: time,
        gen: 1,
      },
    );
    await db.put(STORES.meta, nonsense as unknown as StoredRecord, META_KEY);

    const result = await createSaveLayer(db).loadMeta();
    expect(result.status).toBe('corrupt');
  });
});

describe('openSave', () => {
  it('records the boot and advances the clock high-water mark', async () => {
    const first = await openSave(dbName);
    const createdAt = first.meta.record.createdAt;
    first.save.close();

    time += 3_600_000;
    const second = await openSave(dbName);

    expect(second.meta.status).toBe('loaded');
    expect(second.meta.record.createdAt).toBe(createdAt);
    expect(second.meta.record.lastKnownWallClock).toBeGreaterThanOrEqual(createdAt);

    const reloaded = await second.save.loadMeta();
    expect(reloaded.record.lastOpenedAt).toBe(time);
    second.save.close();
  });

  it('never writes over a save it could not verify', async () => {
    const first = await openSave(dbName);
    const damaged = {
      ...(first.meta.record as unknown as StoredRecord),
      lastKnownWallClock: 1,
    };
    first.save.close();

    const raw = await openDatabase(dbName);
    await raw.put(STORES.meta, damaged, META_KEY);
    raw.close();

    const second = await openSave(dbName);
    expect(second.meta.status).toBe('corrupt');

    const check = await openDatabase(dbName);
    const onDisk = (await check.get(STORES.meta, META_KEY)) as StoredRecord;
    expect(onDisk['lastKnownWallClock']).toBe(1);
    check.close();
    second.save.close();
  });
});

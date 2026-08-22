import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClock, setClock } from '@/app/time.ts';
import { createAccount } from '@/domain/character/account.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character, SlotId } from '@/domain/character/types.ts';
import { backupPrefix } from './backups.ts';
import { openDatabase, type SaveDatabase } from './db.ts';
import { stamp } from './integrity.ts';
import { createSaveLayer, openSave, type SaveLayer } from './saveLayer.ts';
import {
  ACCOUNT_KEY,
  CURRENT_SCHEMA_VERSION,
  META_KEY,
  STORES,
  characterKey,
  type StoredRecord,
} from './schema.ts';

let dbName: string;
let db: SaveDatabase;
let save: SaveLayer;
let time: number;

function hero(slotId: SlotId = 1, name = 'Grimhild'): Character {
  return createCharacter({
    slotId,
    name,
    classId: 'warrior',
    createdAt: time,
    runSeed: `run:${slotId}`,
  });
}

beforeEach(async () => {
  dbName = `omf-test-${Math.random().toString(36).slice(2)}`;
  time = 1_700_000_000_000;
  setClock(createClock({ source: () => time }));
  db = await openDatabase(dbName);
  save = createSaveLayer(db);
});

afterEach(() => {
  db.close();
  setClock(createClock());
});

describe('meta', () => {
  it('creates a record on a first run and round-trips it', async () => {
    const created = await save.loadMeta();
    expect(created.status).toBe('created');
    expect(created.record?.createdAt).toBe(time);

    time += 60_000;
    await save.saveMeta({
      createdAt: created.record!.createdAt,
      lastOpenedAt: time,
      lastKnownWallClock: time,
    });

    const reloaded = await save.loadMeta();
    expect(reloaded.status).toBe('loaded');
    expect(reloaded.record?.lastOpenedAt).toBe(time);
    expect(reloaded.record?.createdAt).toBe(created.record?.createdAt);
  });

  it('increments the generation counter on every write', async () => {
    const created = await save.loadMeta();
    expect(created.record?.integrity.gen).toBe(1);

    const body = {
      createdAt: created.record!.createdAt,
      lastOpenedAt: time,
      lastKnownWallClock: time,
    };
    expect((await save.saveMeta(body)).integrity.gen).toBe(2);
    expect((await save.saveMeta(body)).integrity.gen).toBe(3);
  });
});

describe('account', () => {
  it('reports an absent account rather than inventing one', async () => {
    expect((await save.loadAccount()).status).toBe('absent');
  });

  it('round-trips account upgrades', async () => {
    await save.saveAccount({ ...createAccount(), battleSpeedTier: 2, slotsUnlocked: 3 });

    const loaded = await save.loadAccount();
    expect(loaded.status).toBe('loaded');
    expect(loaded.record?.account.battleSpeedTier).toBe(2);
    expect(loaded.record?.account.slotsUnlocked).toBe(3);
  });
});

describe('characters', () => {
  it('reports an empty slot as absent', async () => {
    expect((await save.loadCharacter(3)).status).toBe('absent');
  });

  it('creates a character and points the account at it in one action', async () => {
    const character = hero(2);
    await save.createCharacter(character, { ...createAccount(), activeSlotId: 2 });

    const loaded = await save.loadCharacter(2);
    expect(loaded.record?.character.identity.name).toBe('Grimhild');
    expect((await save.loadAccount()).record?.account.activeSlotId).toBe(2);
  });

  it('keeps slots independent', async () => {
    await save.saveCharacter(hero(1, 'Grimhild'));
    await save.saveCharacter(hero(4, 'Rowan'));

    const all = await save.loadAllCharacters();
    expect(all.get(1)?.record?.character.identity.name).toBe('Grimhild');
    expect(all.get(4)?.record?.character.identity.name).toBe('Rowan');
    expect(all.get(2)?.status).toBe('absent');
  });

  it('deletes a character on reset but keeps account upgrades (Q4)', async () => {
    const account = { ...createAccount(), battleSpeedTier: 3 as const, slotsUnlocked: 4 };
    await save.createCharacter(hero(1), { ...account, activeSlotId: 1 });

    await save.deleteCharacter(1, { ...account, activeSlotId: null });

    expect((await save.loadCharacter(1)).status).toBe('absent');
    const reloaded = await save.loadAccount();
    expect(reloaded.record?.account.battleSpeedTier).toBe(3);
    expect(reloaded.record?.account.slotsUnlocked).toBe(4);
    expect(reloaded.record?.account.activeSlotId).toBeNull();
  });

  it('backs a character up before deleting it, so a reset is still recoverable', async () => {
    await save.saveCharacter(hero(1));
    await save.deleteCharacter(1, createAccount());

    const keys = await db.getAllKeys(STORES.saveBackups);
    const prefix = backupPrefix(STORES.characters, characterKey(1));
    expect(keys.some((key) => String(key).startsWith(prefix))).toBe(true);
  });
});

describe('integrity and recovery', () => {
  it('quarantines a corrupt record and recovers it, even after a single write', async () => {
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 3 });
    const stored = (await db.get(STORES.account, ACCOUNT_KEY)) as StoredRecord;
    // Corrupt it without updating the checksum.
    await db.put(STORES.account, { ...stored, account: { nonsense: true } }, ACCOUNT_KEY);

    const loaded = await save.loadAccount();

    // A record's first write seeds its own backup, so even a record that has
    // only ever been written once survives corruption.
    expect(loaded.status).toBe('recovered');
    expect(loaded.record?.account.slotsUnlocked).toBe(3);
    const quarantined = (await db.getAllKeys(STORES.saveBackups)).filter((key) =>
      String(key).includes('quarantine'),
    );
    expect(quarantined).toHaveLength(1);
  });

  it('recovers a character corrupted right after creation', async () => {
    await save.createCharacter(hero(1, 'Grimhild'), createAccount());
    const stored = (await db.get(STORES.characters, characterKey(1))) as StoredRecord;
    await db.put(STORES.characters, { ...stored, character: null }, characterKey(1));

    const loaded = await save.loadCharacter(1);

    expect(loaded.status).toBe('recovered');
    expect(loaded.record?.character.identity.name).toBe('Grimhild');
  });

  it('restores the newest good generation when the live record is damaged', async () => {
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 2 });
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 3 });
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 4 });

    const stored = (await db.get(STORES.account, ACCOUNT_KEY)) as StoredRecord;
    await db.put(STORES.account, { ...stored, schemaVersion: 999_999 }, ACCOUNT_KEY);

    const loaded = await save.loadAccount();

    expect(loaded.status).toBe('recovered');
    // The newest surviving generation is the one written just before the damage.
    expect(loaded.record?.account.slotsUnlocked).toBe(3);
    expect(loaded.recoveredFrom?.takenAt).toBeTypeOf('number');
  });

  it('leaves the recovered record in place, so the next load is ordinary', async () => {
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 2 });
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 3 });

    const stored = (await db.get(STORES.account, ACCOUNT_KEY)) as StoredRecord;
    await db.put(STORES.account, { ...stored, account: 'not an object' }, ACCOUNT_KEY);

    expect((await save.loadAccount()).status).toBe('recovered');
    expect((await save.loadAccount()).status).toBe('loaded');
  });

  it('reports corrupt when nothing can be recovered', async () => {
    const bogus = stamp(
      { schemaVersion: CURRENT_SCHEMA_VERSION, account: 'broken' },
      {
        writtenAt: time,
        gen: 1,
      },
    );
    await db.put(STORES.account, bogus as unknown as StoredRecord, ACCOUNT_KEY);

    const loaded = await save.loadAccount();
    expect(loaded.status).toBe('corrupt');
    expect(loaded.record).toBeNull();
  });

  it('never deletes the damaged data it could not use', async () => {
    const bogus = stamp(
      { schemaVersion: CURRENT_SCHEMA_VERSION, account: 'broken' },
      {
        writtenAt: time,
        gen: 1,
      },
    );
    await db.put(STORES.account, bogus as unknown as StoredRecord, ACCOUNT_KEY);
    await save.loadAccount();

    const quarantined = (await db.getAllKeys(STORES.saveBackups)).filter((key) =>
      String(key).includes('quarantine'),
    );
    expect(quarantined).toHaveLength(1);
  });

  it('rejects a save written by a newer build rather than migrating it down', async () => {
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

    await expect(save.loadMeta()).rejects.toThrow(/newer version of the game/);
  });

  it('detects a record that hashes correctly but is structurally wrong', async () => {
    const wrong = stamp(
      { schemaVersion: CURRENT_SCHEMA_VERSION, character: { slotId: 99, identity: {} } },
      { writtenAt: time, gen: 1 },
    );
    await db.put(STORES.characters, wrong as unknown as StoredRecord, characterKey(1));

    expect((await save.loadCharacter(1)).status).toBe('corrupt');
  });
});

describe('backup retention', () => {
  it('keeps a bounded number of rolling generations', async () => {
    for (let i = 1; i <= 8; i += 1) {
      await save.saveAccount({ ...createAccount(), slotsUnlocked: ((i % 5) + 1) as 1 });
    }

    const prefix = backupPrefix(STORES.account, ACCOUNT_KEY);
    const keys = (await db.getAllKeys(STORES.saveBackups)).map(String);
    const rolling = keys.filter((key) => key.startsWith(`${prefix}gen:`));
    const daily = keys.filter((key) => key === `${prefix}daily`);

    expect(rolling).toHaveLength(3);
    expect(daily).toHaveLength(1);
  });

  it('keeps the daily snapshot from rolling over within the same day', async () => {
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 2 });
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 3 });
    await save.saveAccount({ ...createAccount(), slotsUnlocked: 4 });

    const daily = await db.get(
      STORES.saveBackups,
      `${backupPrefix(STORES.account, ACCOUNT_KEY)}daily`,
    );
    // Still the very first version, which is what makes it reach further back
    // than the rolling three.
    const record = (daily as { record: { account: { slotsUnlocked: number } } }).record;
    expect(record.account.slotsUnlocked).toBe(2);
  });
});

describe('openSave', () => {
  it('records the boot and preserves the clock high-water mark', async () => {
    const first = await openSave(dbName);
    const createdAt = first.meta.record!.createdAt;
    first.save.close();

    time += 3_600_000;
    const second = await openSave(dbName);

    expect(second.meta.status).toBe('loaded');
    expect(second.meta.record?.createdAt).toBe(createdAt);
    expect((await second.save.loadMeta()).record?.lastOpenedAt).toBe(time);
    second.save.close();
  });

  it('never lowers the high-water mark when the clock has moved backwards', async () => {
    const first = await openSave(dbName);
    const high = first.meta.record!.lastKnownWallClock;
    first.save.close();

    // A fresh clock with no memory of the high-water mark, reading an earlier time.
    setClock(createClock({ source: () => high - 86_400_000 }));
    const second = await openSave(dbName);

    expect((await second.save.loadMeta()).record?.lastKnownWallClock).toBeGreaterThanOrEqual(high);
    second.save.close();
  });
});

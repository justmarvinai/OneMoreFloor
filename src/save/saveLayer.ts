/**
 * The save layer's public surface.
 *
 * Three rules shape everything here (SAVE_SCHEMA §1–§6):
 *
 *  1. **One user action is one transaction.** Creating a hero writes the
 *     character *and* the account's active slot together, so a crash can never
 *     leave a character nobody is playing or an account pointing at nothing.
 *  2. **Nothing is overwritten without a copy.** Every write backs up the version
 *     it replaces, which is what makes the recovery ladder possible.
 *  3. **Corrupt data is quarantined, never discarded.** A record that fails its
 *     checksum or its shape is copied aside before anything is restored over it.
 */
import { clock } from '@/app/time.ts';
import type { Account, Character, SlotId } from '@/domain/character/types.ts';
import {
  backupRange,
  dailyBackupKey,
  isBackupEnvelope,
  orderNewestFirst,
  quarantineKey,
  rollingBackupKey,
  rollingKeysToPrune,
  toEnvelopeRecord,
  type BackupEnvelope,
} from './backups.ts';
import { openDatabase, type SaveDatabase } from './db.ts';
import { stamp, verify } from './integrity.ts';
import { FutureSaveError, migrate } from './migrations.ts';
import { isAccountRecord, isCharacterRecord, isMetaRecord } from './records.ts';
import {
  ACCOUNT_KEY,
  CURRENT_SCHEMA_VERSION,
  META_KEY,
  STORES,
  characterKey,
  type AccountRecord,
  type CharacterRecord,
  type MetaRecord,
  type StoreName,
  type StoredRecord,
} from './schema.ts';

/** How a record came back from disk. */
export type LoadStatus =
  /** Read, verified and already current. */
  | 'loaded'
  /** No record existed; a fresh one was created. */
  | 'created'
  /** Read and verified, after migrating forward from an older version. */
  | 'migrated'
  /** The primary was unusable; an earlier generation was restored (§6). */
  | 'recovered'
  /** Nothing usable survived. The bad data is quarantined, not deleted. */
  | 'corrupt'
  /** There is legitimately nothing here — an empty character slot. */
  | 'absent';

export interface LoadResult<T> {
  status: LoadStatus;
  /** Null only for `absent` and `corrupt`. */
  record: T | null;
  migratedFrom: number[];
  /** Present on `recovered`: when the restored generation was taken. */
  recoveredFrom?: { takenAt: number; dayKey: string };
}

interface RecordShape<T> {
  store: StoreName;
  key: string;
  validate(record: StoredRecord): record is StoredRecord & T;
}

const META_SHAPE: RecordShape<MetaRecord> = {
  store: STORES.meta,
  key: META_KEY,
  validate: isMetaRecord,
};

const ACCOUNT_SHAPE: RecordShape<AccountRecord> = {
  store: STORES.account,
  key: ACCOUNT_KEY,
  validate: isAccountRecord,
};

function characterShape(slotId: SlotId): RecordShape<CharacterRecord> {
  return { store: STORES.characters, key: characterKey(slotId), validate: isCharacterRecord };
}

/** A record body (no integrity block) destined for one store key. */
interface WriteRequest {
  store: StoreName;
  key: string;
  body: StoredRecord;
}

/**
 * Every transaction spans every store. The set is tiny and this is a
 * single-player local game, so the cost is nil — and it makes "one user action,
 * one transaction" the default rather than something each call site arranges.
 */
const ALL_STORES = [STORES.meta, STORES.account, STORES.characters, STORES.saveBackups] as const;

export interface SaveLayer {
  loadMeta(): Promise<LoadResult<MetaRecord>>;
  saveMeta(meta: Omit<MetaRecord, 'integrity' | 'schemaVersion'>): Promise<MetaRecord>;

  loadAccount(): Promise<LoadResult<AccountRecord>>;
  saveAccount(account: Account): Promise<void>;

  loadCharacter(slotId: SlotId): Promise<LoadResult<CharacterRecord>>;
  /** Every slot's state, for the character-select screen. */
  loadAllCharacters(): Promise<Map<SlotId, LoadResult<CharacterRecord>>>;

  /** Create a hero and point the account at it — one action, one transaction. */
  createCharacter(character: Character, account: Account): Promise<void>;
  saveCharacter(character: Character): Promise<void>;
  /** Reset a slot (Brief §19): the record is backed up, then removed. */
  deleteCharacter(slotId: SlotId, account: Account): Promise<void>;

  close(): void;
}

export function createSaveLayer(db: SaveDatabase): SaveLayer {
  /**
   * Read a record, then migrate and validate it. Anything unusable falls through
   * to the recovery ladder, which walks the backups newest first.
   */
  async function read<T>(shape: RecordShape<T>): Promise<LoadResult<T>> {
    const stored = await db.get(shape.store, shape.key);

    if (stored === undefined) return { status: 'absent', record: null, migratedFrom: [] };

    const direct = accept(stored, shape);
    if (direct) {
      return {
        status: direct.migratedFrom.length > 0 ? 'migrated' : 'loaded',
        record: direct.record,
        migratedFrom: direct.migratedFrom,
      };
    }

    return recover(stored, shape);
  }

  /** Verify → migrate → shape-check. Returns null if any step rejects it. */
  function accept<T>(
    stored: StoredRecord,
    shape: RecordShape<T>,
  ): { record: T; migratedFrom: number[] } | null {
    if (!verify(stored)) return null;

    // A FutureSaveError is a different situation from corruption — the data is
    // fine, this build is simply too old — so it propagates rather than
    // triggering recovery over a perfectly good save.
    const { record: migrated, applied } = migrate(stored);
    if (!shape.validate(migrated)) return null;

    return { record: migrated as T, migratedFrom: applied };
  }

  /** The recovery ladder (SAVE_SCHEMA §6). */
  async function recover<T>(bad: StoredRecord, shape: RecordShape<T>): Promise<LoadResult<T>> {
    const now = clock().now();
    const [lower, upper] = backupRange(shape.store, shape.key);

    // Quarantine first: whatever happens next, the damaged blob survives for
    // manual inspection. Player data is never thrown away.
    await db.put(
      STORES.saveBackups,
      toEnvelopeRecord({ record: bad, takenAt: now, dayKey: clock().dayKey() }),
      quarantineKey(shape.store, shape.key, now),
    );

    const keys = await db.getAllKeys(STORES.saveBackups, IDBKeyRange.bound(lower, upper));

    for (const key of orderNewestFirst(keys)) {
      const envelope = await db.get(STORES.saveBackups, key);
      if (!isBackupEnvelope(envelope)) continue;

      const candidate = accept(envelope.record, shape);
      if (!candidate) continue;

      // Restore it as the live record so the next boot is ordinary.
      await db.put(shape.store, envelope.record, shape.key);
      return {
        status: 'recovered',
        record: candidate.record,
        migratedFrom: candidate.migratedFrom,
        recoveredFrom: { takenAt: envelope.takenAt, dayKey: envelope.dayKey },
      };
    }

    return { status: 'corrupt', record: null, migratedFrom: [] };
  }

  /**
   * Write records atomically, backing up whatever each one replaces.
   *
   * Everything time-related is read before the transaction opens: awaiting a
   * non-IndexedDB promise inside one lets the browser close it out from under us.
   */
  async function write(requests: readonly WriteRequest[], deletes: readonly WriteRequest[] = []) {
    const now = clock().now();
    const dayKey = clock().dayKey();

    const tx = db.transaction(ALL_STORES, 'readwrite');
    const backups = tx.objectStore(STORES.saveBackups);

    const written: StoredRecord[] = [];

    try {
      for (const request of [...requests, ...deletes]) {
        const store = tx.objectStore(request.store);
        const existing = await store.get(request.key);
        const isDelete = deletes.includes(request);

        let nextGen = 1;
        if (existing) {
          const integrity = existing['integrity'] as { gen?: number } | undefined;
          const gen = typeof integrity?.gen === 'number' ? integrity.gen : 0;
          nextGen = gen + 1;

          const envelope: BackupEnvelope = { record: existing, takenAt: now, dayKey };
          await backups.put(
            toEnvelopeRecord(envelope),
            rollingBackupKey(request.store, request.key, gen),
          );

          // The daily slot only rolls over when the day does, so it stays older
          // than the rolling three and reaches further back.
          const dailyKey = dailyBackupKey(request.store, request.key);
          const currentDaily = await backups.get(dailyKey);
          if (!isBackupEnvelope(currentDaily) || currentDaily.dayKey !== dayKey) {
            await backups.put(toEnvelopeRecord(envelope), dailyKey);
          }

          const [lower, upper] = backupRange(request.store, request.key);
          const keys = await backups.getAllKeys(IDBKeyRange.bound(lower, upper));
          for (const stale of rollingKeysToPrune(keys)) await backups.delete(stale);
        }

        if (isDelete) {
          await store.delete(request.key);
        } else {
          const body: StoredRecord = { ...request.body, schemaVersion: CURRENT_SCHEMA_VERSION };
          const record = stamp(body, { writtenAt: now, gen: nextGen });
          await store.put(record, request.key);
          written.push(record);

          if (!existing) {
            // A record's first write has nothing to preserve, which would leave it
            // with no backup at all until the second one. Seed the daily slot with
            // the new record instead, so every record is recoverable from the
            // moment it exists — the case that matters most for a character the
            // player just spent time creating.
            await backups.put(
              toEnvelopeRecord({ record, takenAt: now, dayKey }),
              dailyBackupKey(request.store, request.key),
            );
          }
        }
      }

      await tx.done;
    } catch (error) {
      // **Abort explicitly.** Letting the exception escape leaves IndexedDB to
      // commit whatever already succeeded the moment the request queue drains,
      // which is how a crash mid-write could strand an account pointing at a
      // character that was never created. The M10 fault-injection harness found
      // exactly that (SAVE_SCHEMA §5/§11).
      try {
        tx.abort();
      } catch {
        // Already aborted or already committed; the original error is the one
        // worth reporting.
      }
      throw error;
    }
    return written;
  }

  return {
    async loadMeta() {
      const result = await read(META_SHAPE);
      if (result.status !== 'absent') return result;

      const now = clock().now();
      const [record] = await write([
        {
          store: STORES.meta,
          key: META_KEY,
          body: { createdAt: now, lastOpenedAt: now, lastKnownWallClock: now },
        },
      ]);
      return { status: 'created', record: record as unknown as MetaRecord, migratedFrom: [] };
    },

    async saveMeta(meta) {
      const [record] = await write([
        {
          store: STORES.meta,
          key: META_KEY,
          body: {
            createdAt: meta.createdAt,
            lastOpenedAt: meta.lastOpenedAt,
            lastKnownWallClock: meta.lastKnownWallClock,
          },
        },
      ]);
      return record as unknown as MetaRecord;
    },

    loadAccount: () => read(ACCOUNT_SHAPE),

    async saveAccount(account) {
      await write([{ store: STORES.account, key: ACCOUNT_KEY, body: { account } }]);
    },

    loadCharacter: (slotId) => read(characterShape(slotId)),

    async loadAllCharacters() {
      const results = new Map<SlotId, LoadResult<CharacterRecord>>();
      for (const slotId of [1, 2, 3, 4, 5] as SlotId[]) {
        results.set(slotId, await read(characterShape(slotId)));
      }
      return results;
    },

    async createCharacter(character, account) {
      // Both halves or neither: a hero nobody is playing, or an account pointing
      // at an empty slot, would each be a broken game state (SAVE_SCHEMA §6).
      await write([
        { store: STORES.characters, key: characterKey(character.slotId), body: { character } },
        { store: STORES.account, key: ACCOUNT_KEY, body: { account } },
      ]);
    },

    async saveCharacter(character) {
      await write([
        { store: STORES.characters, key: characterKey(character.slotId), body: { character } },
      ]);
    },

    async deleteCharacter(slotId, account) {
      await write(
        [{ store: STORES.account, key: ACCOUNT_KEY, body: { account } }],
        [{ store: STORES.characters, key: characterKey(slotId), body: {} }],
      );
    },

    close() {
      db.close();
    },
  };
}

export interface OpenSaveResult {
  save: SaveLayer;
  meta: LoadResult<MetaRecord>;
}

/**
 * Open the save for a session: connect, load meta, record this boot.
 *
 * The caller arms the clock from `meta.record.lastKnownWallClock` afterwards; the
 * `Math.max` here means a rolled-back clock can never lower the high-water mark
 * even on the boot before that happens (SAVE_SCHEMA §7).
 */
export async function openSave(name?: string): Promise<OpenSaveResult> {
  const db = await openDatabase(name);
  const save = createSaveLayer(db);
  const meta = await save.loadMeta();

  if (meta.record) {
    const now = clock().now();
    await save.saveMeta({
      createdAt: meta.record.createdAt,
      lastOpenedAt: now,
      lastKnownWallClock: Math.max(meta.record.lastKnownWallClock, now),
    });
  }

  return { save, meta };
}

export { FutureSaveError };

/**
 * The save layer's public surface.
 *
 * Everything the game persists goes through here, and every write is a whole
 * record inside a single transaction — never a scattered field patch (SAVE_SCHEMA
 * §1–2). Reads run the migration chain first and verify the checksum second, so
 * the game only ever sees data that is both current and intact.
 *
 * At M0 this covers the meta record, which is what proves the round-trip end to
 * end. Account and character records, generational backups and the recovery
 * ladder land in M1 on exactly this seam (ROADMAP).
 */
import { clock } from '@/app/time.ts';
import { openDatabase, type SaveDatabase } from './db.ts';
import { stamp, verify } from './integrity.ts';
import { FutureSaveError, migrate } from './migrations.ts';
import {
  CURRENT_SCHEMA_VERSION,
  META_KEY,
  STORES,
  type MetaRecord,
  type StoredRecord,
} from './schema.ts';

/** How a record came back from disk. */
export type LoadStatus =
  /** Read, verified and already at the current schema version. */
  | 'loaded'
  /** No record existed; a fresh one was created. */
  | 'created'
  /** Read and verified, after being migrated forward from an older version. */
  | 'migrated'
  /**
   * Found but failed its checksum. The blob is left untouched for the recovery
   * ladder (SAVE_SCHEMA §6) — corrupted data is never silently overwritten.
   */
  | 'corrupt';

export interface LoadResult<T> {
  status: LoadStatus;
  record: T;
  /** Schema versions migrated through, oldest first. */
  migratedFrom: number[];
}

export interface SaveLayer {
  /** Read the meta record, creating it on a first run. */
  loadMeta(): Promise<LoadResult<MetaRecord>>;
  /** Write the meta record as a whole, stamped with a fresh integrity block. */
  saveMeta(record: MetaRecord): Promise<MetaRecord>;
  close(): void;
}

function freshMeta(now: number): MetaRecord {
  return stamp(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: now,
      lastOpenedAt: now,
      lastKnownWallClock: now,
    },
    { writtenAt: now, gen: 1 },
  );
}

function isMetaRecord(record: StoredRecord): record is StoredRecord & MetaRecord {
  return (
    typeof record['createdAt'] === 'number' &&
    typeof record['lastOpenedAt'] === 'number' &&
    typeof record['lastKnownWallClock'] === 'number'
  );
}

export function createSaveLayer(db: SaveDatabase): SaveLayer {
  return {
    async loadMeta() {
      const stored = (await db.get(STORES.meta, META_KEY)) as StoredRecord | undefined;

      if (!stored) {
        const record = freshMeta(clock().now());
        await db.put(STORES.meta, record as unknown as StoredRecord, META_KEY);
        return { status: 'created', record, migratedFrom: [] };
      }

      // Verify before migrating: a corrupt blob must not be run through
      // migrations that assume well-formed input.
      if (!verify(stored)) {
        return {
          status: 'corrupt',
          record: freshMeta(clock().now()),
          migratedFrom: [],
        };
      }

      const { record: migrated, applied } = migrate(stored);
      if (!isMetaRecord(migrated)) {
        return { status: 'corrupt', record: freshMeta(clock().now()), migratedFrom: applied };
      }

      return {
        status: applied.length > 0 ? 'migrated' : 'loaded',
        record: migrated,
        migratedFrom: applied,
      };
    },

    async saveMeta(record) {
      const previous = (await db.get(STORES.meta, META_KEY)) as StoredRecord | undefined;
      const previousGen =
        previous && verify(previous) ? ((previous['integrity'] as { gen?: number }).gen ?? 0) : 0;

      const stamped = stamp(
        { ...record, schemaVersion: CURRENT_SCHEMA_VERSION },
        { writtenAt: clock().now(), gen: previousGen + 1 },
      );
      await db.put(STORES.meta, stamped as unknown as StoredRecord, META_KEY);
      return stamped;
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
 * Open the save for a session: connect, load meta, and record this boot.
 * A `FutureSaveError` is left to propagate — the boot code shows it in-game
 * rather than the save layer guessing what to do with a save it cannot read.
 */
export async function openSave(name?: string): Promise<OpenSaveResult> {
  const db = await openDatabase(name);
  const save = createSaveLayer(db);
  const meta = await save.loadMeta();

  if (meta.status !== 'corrupt') {
    const now = clock().now();
    await save.saveMeta({
      ...meta.record,
      lastOpenedAt: now,
      lastKnownWallClock: Math.max(meta.record.lastKnownWallClock, now),
    });
  }

  return { save, meta };
}

export { FutureSaveError };

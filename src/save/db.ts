/**
 * IndexedDB access.
 *
 * IndexedDB's own `version` mechanism is used for nothing but creating the object
 * stores. Data *shape* versioning is ours (`schemaVersion` inside each record),
 * because upgrade events are a far clumsier place to run migrations than a plain
 * ordered registry of pure functions (SAVE_SCHEMA §2).
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DATABASE_NAME, STORES, type StoredRecord } from './schema.ts';

/**
 * Every store is keyed by string, including `characters` (`slot-1` … `slot-5`).
 * Uniform key types keep the store name and its key from having to be correlated
 * at every call site, which is the difference between typed access and a trail
 * of casts.
 */
export interface OneMoreFloorDB extends DBSchema {
  meta: { key: string; value: StoredRecord };
  account: { key: string; value: StoredRecord };
  characters: { key: string; value: StoredRecord };
  /**
   * Backups hold an envelope — the preserved record plus when it was taken —
   * stored as a plain record like everything else, and narrowed on read by
   * `isBackupEnvelope`.
   */
  saveBackups: { key: string; value: StoredRecord };
}

export type SaveDatabase = IDBPDatabase<OneMoreFloorDB>;

/** Bumped only when object stores are added or removed, never for record shapes. */
const IDB_VERSION = 1;

export function openDatabase(name: string = DATABASE_NAME): Promise<SaveDatabase> {
  return openDB<OneMoreFloorDB>(name, IDB_VERSION, {
    upgrade(db) {
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    },
  });
}

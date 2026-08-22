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

export interface OneMoreFloorDB extends DBSchema {
  meta: { key: string; value: StoredRecord };
  account: { key: string; value: StoredRecord };
  characters: { key: number; value: StoredRecord };
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

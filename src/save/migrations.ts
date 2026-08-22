/**
 * The migration registry.
 *
 * Migrations are pure functions from one schema version to the next, run in
 * sequence on load. Two rules make this survivable long-term (SAVE_SCHEMA §4):
 *
 *  1. Every schema bump registers `n → n+1` here **in the same commit**, with a
 *     fixture test built from a real captured blob of version `n`.
 *  2. A save written by a *newer* build is refused, never migrated downwards.
 *     Silently discarding fields we don't understand would destroy a player's
 *     progress after a rollback.
 */
import { CURRENT_SCHEMA_VERSION, type StoredRecord } from './schema.ts';

export type Migration = (record: StoredRecord) => StoredRecord;

/** Keyed by the version being migrated *from*: `1` upgrades v1 → v2. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // No migrations yet: the schema has only ever been at version 1.
};

export class FutureSaveError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(
      `This save was written by a newer version of the game (schema ${found}, ` +
        `this build supports ${supported}). Update the game to open it.`,
    );
    this.name = 'FutureSaveError';
  }
}

export interface MigrationResult {
  record: StoredRecord;
  /** Versions migrated *from*, in order. Empty when the record was already current. */
  applied: number[];
}

/** Read a record's schema version, treating an absent/invalid one as version 1. */
export function versionOf(record: StoredRecord): number {
  const version = record['schemaVersion'];
  return typeof version === 'number' && Number.isInteger(version) && version > 0 ? version : 1;
}

/** Run a record forward to the current schema version. */
export function migrate(
  record: StoredRecord,
  target: number = CURRENT_SCHEMA_VERSION,
): MigrationResult {
  let version = versionOf(record);
  if (version > target) throw new FutureSaveError(version, target);

  let current = record;
  const applied: number[] = [];

  while (version < target) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      throw new Error(
        `No migration registered for schema version ${version} → ${version + 1}. ` +
          `Every schema bump must register one (SAVE_SCHEMA §4).`,
      );
    }
    current = { ...migration(current), schemaVersion: version + 1 };
    applied.push(version);
    version += 1;
  }

  return { record: current, applied };
}

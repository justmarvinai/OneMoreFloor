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
import { createRng } from '@/app/rng.ts';
import { createStartingEquipment } from '@/domain/items/starting.ts';
import { isClassId } from '@/content/classes/index.ts';
import { CURRENT_SCHEMA_VERSION, type StoredRecord } from './schema.ts';

export type Migration = (record: StoredRecord) => StoredRecord;

/**
 * v1 → v2: characters gained equipment, inventory, currencies and materials.
 *
 * A v1 character was created before the item system existed, so it has no
 * weapon — and a hero who cannot be armed is a hero who cannot play. This grants
 * the starting loadout their class was always meant to have (Brief §5), rolled
 * from their own stored run seed so the result is deterministic and the same on
 * every device that opens the save.
 *
 * Records that are not characters pass through untouched: the meta and account
 * shapes did not change in this version.
 */
const v1ToV2: Migration = (record) => {
  const character = record['character'];
  if (character === null || typeof character !== 'object') return record;

  const existing = character as Record<string, unknown>;
  const identity = existing['identity'] as { classId?: unknown } | undefined;
  const tower = existing['tower'] as { runSeed?: unknown } | undefined;

  const classId = isClassId(identity?.classId) ? identity.classId : 'warrior';
  const runSeed = typeof tower?.runSeed === 'string' ? tower.runSeed : `legacy:${classId}`;

  return {
    ...record,
    character: {
      ...existing,
      equipment: createStartingEquipment(classId, createRng(`${runSeed}/creation`)),
      inventory: [],
      currencies: { gold: 0, tickets: 0, luckyTickets: 0 },
      materials: {},
    },
  };
};

/** Keyed by the version being migrated *from*: `1` upgrades v1 → v2. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: v1ToV2,
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

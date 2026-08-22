/**
 * Persisted record shapes and the schema version they are written at.
 *
 * **The rule (CLAUDE.md, SAVE_SCHEMA §4): any change to a shape in this file bumps
 * `CURRENT_SCHEMA_VERSION` and ships its migration plus a captured-blob fixture
 * test in the same commit.** A player with hundreds of hours must survive every
 * update, and a migration written later never gets written.
 *
 * Game data is nested under a single key (`account`, `character`) rather than
 * spread across the record, which keeps persistence concerns — the version, the
 * checksum — from tangling with the domain shapes they wrap.
 */
import type { Account, Character, SlotId } from '@/domain/character/types.ts';
import type { Persisted } from './integrity.ts';

/**
 * Version history — every entry has a migration and a captured fixture:
 *   1. Account and character records (M1).
 *   2. Characters gained equipment, inventory, currencies and materials (M2).
 */
export const CURRENT_SCHEMA_VERSION = 3;

export const DATABASE_NAME = 'onemorefloor';

/** IndexedDB object stores. Data shape versioning is ours, not IndexedDB's. */
export const STORES = {
  meta: 'meta',
  account: 'account',
  characters: 'characters',
  saveBackups: 'saveBackups',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export const META_KEY = 'meta';
export const ACCOUNT_KEY = 'account';

/** The single row in the `meta` store. */
export interface MetaRecord extends Persisted {
  schemaVersion: number;
  /** First time this installation was opened. */
  createdAt: number;
  /** Most recent boot. */
  lastOpenedAt: number;
  /**
   * Highest wall-clock time ever observed, persisted so the clock's rollback
   * damping survives a restart (SAVE_SCHEMA §7).
   */
  lastKnownWallClock: number;
}

/** Account-wide state: upgrades that survive any character reset (Q4). */
export interface AccountRecord extends Persisted {
  schemaVersion: number;
  account: Account;
}

/** One character slot. Absent means the slot is empty — never a blank record. */
export interface CharacterRecord extends Persisted {
  schemaVersion: number;
  character: Character;
}

/** A record as it comes off disk: shape unproven until migrated and verified. */
export type StoredRecord = Record<string, unknown>;

export function characterKey(slotId: SlotId): string {
  return `slot-${slotId}`;
}

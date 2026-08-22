/**
 * Persisted record shapes and the schema version they are written at.
 *
 * **The rule (CLAUDE.md, SAVE_SCHEMA §4): any change to a shape in this file bumps
 * `CURRENT_SCHEMA_VERSION` and ships its migration plus a captured-blob fixture
 * test in the same commit.** A player with hundreds of hours must survive every
 * update, and a migration written later never gets written.
 *
 * Only the meta record exists at M0. Account and character records arrive with the
 * character lifecycle in M1 (ROADMAP), and each addition follows the same rule.
 */
import type { Persisted } from './integrity.ts';

export const CURRENT_SCHEMA_VERSION = 1;

export const DATABASE_NAME = 'onemorefloor';

/** IndexedDB object stores. Data shape versioning is ours, not IndexedDB's. */
export const STORES = {
  meta: 'meta',
  account: 'account',
  characters: 'characters',
  saveBackups: 'saveBackups',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** The single row in the `meta` store. */
export const META_KEY = 'meta';

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

/** A record as it comes off disk: shape unproven until migrated and verified. */
export type StoredRecord = Record<string, unknown>;

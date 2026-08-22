/**
 * Captured save blobs, schema version 1.
 *
 * These are **real records copied off disk**, not hand-written approximations —
 * that is the whole point. A migration tested against an idealised blob is a
 * migration tested against the developer's memory of the format; these carry
 * whatever the game actually wrote, checksums included.
 *
 * Every future schema bump adds a `vN.ts` beside this one, captured the same way
 * (SAVE_SCHEMA §4), and `migrations.fixtures.test.ts` runs each of them forward
 * to the current version.
 */
import type { StoredRecord } from '../schema.ts';

export const V1_META: StoredRecord = {
  schemaVersion: 1,
  createdAt: 1_700_000_000_000,
  lastOpenedAt: 1_700_000_060_000,
  lastKnownWallClock: 1_700_000_060_000,
  integrity: { crc32: '6a854867', writtenAt: 1_700_000_060_000, gen: 2 },
};

export const V1_ACCOUNT: StoredRecord = {
  schemaVersion: 1,
  account: {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: false,
  },
  integrity: { crc32: 'd0f616e8', writtenAt: 1_700_000_060_000, gen: 1 },
};

export const V1_CHARACTER: StoredRecord = {
  schemaVersion: 1,
  character: {
    slotId: 1,
    identity: { name: 'Grimhild', classId: 'warrior', createdAt: 1_700_000_000_000 },
    progression: { level: 1, xp: 0, ascension: 0 },
    purchasedStats: { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 },
    tower: { currentRunFloor: 1, highestFloorEverCleared: 0, runSeed: 'run:1:8f2c1a0b' },
  },
  integrity: { crc32: 'c1ae2b0e', writtenAt: 1_700_000_000_000, gen: 1 },
};

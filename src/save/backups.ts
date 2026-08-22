/**
 * Generational backups and quarantine (SAVE_SCHEMA §6).
 *
 * Before any record is overwritten, the version being replaced is copied aside.
 * That is what turns "your save is corrupt" into "your save is corrupt, here is
 * the one from ten minutes ago" — and it costs one extra put inside a transaction
 * that was happening anyway.
 *
 * Retention per record: the **3 most recent** generations, plus **one daily**
 * snapshot that is only refreshed when the day rolls over. The rolling three
 * cover "something just went wrong"; the daily one covers "something went wrong
 * a while ago and I only noticed now", which the rolling three would have
 * already scrolled past.
 */
import type { StoreName, StoredRecord } from './schema.ts';

export const ROLLING_BACKUP_COUNT = 3;

const KEY_SEPARATOR = ':';
/** Generations are zero-padded so string ordering matches numeric ordering. */
const GEN_WIDTH = 10;

export interface BackupKeyParts {
  store: StoreName;
  key: string;
  kind: 'gen' | 'daily' | 'quarantine';
  /** Generation number for `gen`, day key for `daily`, timestamp for quarantine. */
  marker: string;
}

export function backupPrefix(store: StoreName, key: string | number): string {
  return `${store}${KEY_SEPARATOR}${String(key)}${KEY_SEPARATOR}`;
}

export function rollingBackupKey(store: StoreName, key: string | number, gen: number): string {
  return `${backupPrefix(store, key)}gen${KEY_SEPARATOR}${String(gen).padStart(GEN_WIDTH, '0')}`;
}

export function dailyBackupKey(store: StoreName, key: string | number): string {
  return `${backupPrefix(store, key)}daily`;
}

export function quarantineKey(store: StoreName, key: string | number, at: number): string {
  return `${backupPrefix(store, key)}quarantine${KEY_SEPARATOR}${String(at).padStart(GEN_WIDTH + 4, '0')}`;
}

/** Bounds covering every backup for one record, for a key-range scan. */
export function backupRange(store: StoreName, key: string | number): [string, string] {
  const prefix = backupPrefix(store, key);
  return [prefix, `${prefix}￿`];
}

/** A stored backup wrapper: the record plus enough context to judge it. */
export interface BackupEnvelope {
  /** The record exactly as it was, checksum included. */
  record: StoredRecord;
  /** When the backup was taken. */
  takenAt: number;
  /** Local day key at the time, used to decide when the daily slot rolls over. */
  dayKey: string;
}

/**
 * Flatten an envelope for storage. Explicit rather than a cast, so the persisted
 * shape and the type describing it can never drift apart unnoticed.
 */
export function toEnvelopeRecord(envelope: BackupEnvelope): StoredRecord {
  return { record: envelope.record, takenAt: envelope.takenAt, dayKey: envelope.dayKey };
}

export function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (value === null || typeof value !== 'object') return false;
  const envelope = value as Partial<BackupEnvelope>;
  return (
    typeof envelope.takenAt === 'number' &&
    typeof envelope.dayKey === 'string' &&
    envelope.record !== null &&
    typeof envelope.record === 'object'
  );
}

/**
 * Which rolling backup keys to delete once `keep` newer ones exist.
 * Keys arrive in ascending order from the key-range scan.
 */
export function rollingKeysToPrune(
  keys: readonly string[],
  keep: number = ROLLING_BACKUP_COUNT,
): string[] {
  const rolling = keys.filter((key) => key.includes(`${KEY_SEPARATOR}gen${KEY_SEPARATOR}`));
  return rolling.slice(0, Math.max(0, rolling.length - keep));
}

/** Backup keys newest first — the order the recovery ladder walks them in. */
export function orderNewestFirst(keys: readonly string[]): string[] {
  const rolling = keys
    .filter((key) => key.includes(`${KEY_SEPARATOR}gen${KEY_SEPARATOR}`))
    .slice()
    .sort()
    .reverse();
  const daily = keys.filter((key) => key.endsWith(`${KEY_SEPARATOR}daily`));
  // Rolling generations first (they are newer by construction), then the daily
  // snapshot as the last resort before giving up.
  return [...rolling, ...daily];
}

import { describe, expect, it } from 'vitest';
import {
  backupPrefix,
  backupRange,
  dailyBackupKey,
  isBackupEnvelope,
  orderNewestFirst,
  quarantineKey,
  rollingBackupKey,
  rollingKeysToPrune,
  toEnvelopeRecord,
  ROLLING_BACKUP_COUNT,
} from './backups.ts';
import { STORES } from './schema.ts';

describe('backup keys', () => {
  it('groups every backup of one record under a shared prefix', () => {
    const prefix = backupPrefix(STORES.account, 'account');
    expect(rollingBackupKey(STORES.account, 'account', 3).startsWith(prefix)).toBe(true);
    expect(dailyBackupKey(STORES.account, 'account').startsWith(prefix)).toBe(true);
    expect(quarantineKey(STORES.account, 'account', 1).startsWith(prefix)).toBe(true);
  });

  it('sorts generations numerically, not lexicographically', () => {
    // The bug this prevents: '10' sorting before '9' and the ladder restoring
    // an older backup than the one it should.
    const keys = [2, 9, 10, 11].map((gen) => rollingBackupKey(STORES.meta, 'meta', gen));
    expect([...keys].sort()).toEqual(keys);
  });

  it('builds a range that covers a record and nothing else', () => {
    const [lower, upper] = backupRange(STORES.characters, 'slot-1');
    const mine = rollingBackupKey(STORES.characters, 'slot-1', 1);
    const theirs = rollingBackupKey(STORES.characters, 'slot-2', 1);

    expect(mine >= lower && mine <= upper).toBe(true);
    expect(theirs >= lower && theirs <= upper).toBe(false);
  });

  it('does not let slot-1 backups leak into a slot-10 range', () => {
    const [lower, upper] = backupRange(STORES.characters, 'slot-1');
    const other = rollingBackupKey(STORES.characters, 'slot-10', 1);
    expect(other >= lower && other <= upper).toBe(false);
  });
});

describe('rollingKeysToPrune', () => {
  it('keeps the newest generations and drops the rest', () => {
    const keys = [1, 2, 3, 4, 5].map((gen) => rollingBackupKey(STORES.meta, 'meta', gen));
    const pruned = rollingKeysToPrune(keys);

    expect(pruned).toHaveLength(5 - ROLLING_BACKUP_COUNT);
    expect(pruned).toEqual(keys.slice(0, 2));
  });

  it('prunes nothing while under the limit', () => {
    const keys = [1, 2].map((gen) => rollingBackupKey(STORES.meta, 'meta', gen));
    expect(rollingKeysToPrune(keys)).toEqual([]);
  });

  it('never prunes the daily snapshot or a quarantined blob', () => {
    const keys = [
      ...[1, 2, 3, 4, 5].map((gen) => rollingBackupKey(STORES.meta, 'meta', gen)),
      dailyBackupKey(STORES.meta, 'meta'),
      quarantineKey(STORES.meta, 'meta', 99),
    ];
    const pruned = rollingKeysToPrune(keys);

    expect(pruned.every((key) => key.includes(':gen:'))).toBe(true);
  });
});

describe('orderNewestFirst', () => {
  it('walks rolling generations newest first, then the daily snapshot', () => {
    const keys = [
      dailyBackupKey(STORES.meta, 'meta'),
      rollingBackupKey(STORES.meta, 'meta', 1),
      rollingBackupKey(STORES.meta, 'meta', 3),
      rollingBackupKey(STORES.meta, 'meta', 2),
    ];

    expect(orderNewestFirst(keys)).toEqual([
      rollingBackupKey(STORES.meta, 'meta', 3),
      rollingBackupKey(STORES.meta, 'meta', 2),
      rollingBackupKey(STORES.meta, 'meta', 1),
      dailyBackupKey(STORES.meta, 'meta'),
    ]);
  });

  it('never offers a quarantined blob as a recovery candidate', () => {
    const keys = [quarantineKey(STORES.meta, 'meta', 5), rollingBackupKey(STORES.meta, 'meta', 1)];
    expect(orderNewestFirst(keys)).toEqual([rollingBackupKey(STORES.meta, 'meta', 1)]);
  });
});

describe('envelopes', () => {
  it('round-trips through the stored shape', () => {
    const envelope = { record: { gold: 10 }, takenAt: 1_000, dayKey: '2026-08-22' };
    const stored = toEnvelopeRecord(envelope);
    expect(isBackupEnvelope(stored)).toBe(true);
    expect(stored).toEqual(envelope);
  });

  it('rejects anything that is not an envelope', () => {
    expect(isBackupEnvelope(null)).toBe(false);
    expect(isBackupEnvelope({ record: { a: 1 } })).toBe(false);
    expect(isBackupEnvelope({ takenAt: 1, dayKey: 'x' })).toBe(false);
    expect(isBackupEnvelope({ record: 'nope', takenAt: 1, dayKey: 'x' })).toBe(false);
  });
});

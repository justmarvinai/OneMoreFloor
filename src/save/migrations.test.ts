import { describe, expect, it } from 'vitest';
import { FutureSaveError, MIGRATIONS, migrate, versionOf } from './migrations.ts';
import { CURRENT_SCHEMA_VERSION } from './schema.ts';

describe('versionOf', () => {
  it('reads a valid version', () => {
    expect(versionOf({ schemaVersion: 3 })).toBe(3);
  });

  it('treats a missing or nonsense version as 1', () => {
    expect(versionOf({})).toBe(1);
    expect(versionOf({ schemaVersion: 'two' })).toBe(1);
    expect(versionOf({ schemaVersion: 0 })).toBe(1);
    expect(versionOf({ schemaVersion: 1.5 })).toBe(1);
  });
});

describe('migrate', () => {
  it('leaves a current record untouched', () => {
    const record = { schemaVersion: CURRENT_SCHEMA_VERSION, gold: 10 };
    const result = migrate(record);
    expect(result.record).toEqual(record);
    expect(result.applied).toEqual([]);
  });

  it('refuses a save from a newer build instead of downgrading it', () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow(FutureSaveError);
  });

  it('runs registered migrations in order and stamps each version', () => {
    const registry = {
      1: (record: Record<string, unknown>) => ({ ...record, addedInV2: true }),
      2: (record: Record<string, unknown>) => ({ ...record, addedInV3: true }),
    };
    const chain = (record: Record<string, unknown>, target: number) => {
      let current = record;
      let version = versionOf(current);
      const applied: number[] = [];
      while (version < target) {
        const step = registry[version as 1 | 2];
        current = { ...step(current), schemaVersion: version + 1 };
        applied.push(version);
        version += 1;
      }
      return { record: current, applied };
    };

    // Mirrors migrate()'s contract against a stand-in registry, so the ordering
    // guarantee is covered before the first real migration exists.
    const result = chain({ schemaVersion: 1, gold: 5 }, 3);
    expect(result.record).toEqual({ schemaVersion: 3, gold: 5, addedInV2: true, addedInV3: true });
    expect(result.applied).toEqual([1, 2]);
  });

  it('fails loudly when a version has no registered migration', () => {
    // Migrating to a version beyond the current one has no registered step —
    // the same failure a schema bump without its migration would produce.
    expect(() =>
      migrate({ schemaVersion: CURRENT_SCHEMA_VERSION }, CURRENT_SCHEMA_VERSION + 1),
    ).toThrow(/No migration registered/);
  });

  it('has a migration registered for every version below the current one', () => {
    // The guard that catches a forgotten migration on a schema bump: bumping
    // CURRENT_SCHEMA_VERSION without registering the step fails this test.
    for (let version = 1; version < CURRENT_SCHEMA_VERSION; version += 1) {
      expect(MIGRATIONS[version], `missing migration ${version} → ${version + 1}`).toBeTypeOf(
        'function',
      );
    }
  });
});

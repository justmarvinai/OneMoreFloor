import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createClock, setClock } from '@/app/time.ts';
import { verify } from './integrity.ts';
import { migrate } from './migrations.ts';
import { isAccountRecord, isCharacterRecord, isMetaRecord } from './records.ts';
import { openDatabase } from './db.ts';
import { createSaveLayer } from './saveLayer.ts';
import { CURRENT_SCHEMA_VERSION, ACCOUNT_KEY, META_KEY, STORES, characterKey } from './schema.ts';
import { V1_ACCOUNT, V1_CHARACTER, V1_META } from './fixtures/v1.ts';
import { V2_CHARACTER } from './fixtures/v2.ts';
import { V3_CHARACTER } from './fixtures/v3.ts';
import { V4_CHARACTER } from './fixtures/v4.ts';
import { V5_CHARACTER } from './fixtures/v5.ts';

/**
 * The migration harness (SAVE_SCHEMA §4/§11).
 *
 * Every schema version keeps a set of captured blobs here, and every one of them
 * must still open in the current build. This is the test that turns "we should
 * write a migration" into a failing build rather than a support ticket from a
 * player whose four hundred hours will not load.
 */
const FIXTURES = [
  { version: 1, name: 'meta', blob: V1_META, validate: isMetaRecord },
  { version: 1, name: 'account', blob: V1_ACCOUNT, validate: isAccountRecord },
  { version: 1, name: 'character', blob: V1_CHARACTER, validate: isCharacterRecord },
  { version: 2, name: 'character', blob: V2_CHARACTER, validate: isCharacterRecord },
  { version: 3, name: 'character', blob: V3_CHARACTER, validate: isCharacterRecord },
  { version: 4, name: 'character', blob: V4_CHARACTER, validate: isCharacterRecord },
  { version: 5, name: 'character', blob: V5_CHARACTER, validate: isCharacterRecord },
] as const;

describe('captured save fixtures', () => {
  it.each(FIXTURES)('v$version $name still verifies', ({ blob }) => {
    // If this fails, the record shape changed without the fixture being
    // recaptured — or the checksum algorithm itself moved, which would silently
    // invalidate every save in the wild.
    expect(verify(blob)).toBe(true);
  });

  it.each(FIXTURES)('v$version $name migrates to the current version', ({ blob, validate }) => {
    const { record } = migrate(blob);
    expect(record['schemaVersion']).toBe(CURRENT_SCHEMA_VERSION);
    expect(validate(record)).toBe(true);
  });

  it('arms a v1 hero who predates the item system (Brief §5)', () => {
    // The v1 → v2 migration's real job: a character created before items existed
    // has no weapon, and a hero who cannot be armed cannot play. They get the
    // loadout their class was always meant to have, rolled from their own seed.
    const { record, applied } = migrate(V1_CHARACTER);
    const character = (record as { character: Record<string, unknown> }).character;
    const equipment = character['equipment'] as Record<string, { defId: string }>;

    expect(applied).toEqual([1, 2, 3, 4]);
    expect(equipment['mainhand']?.defId).toBe('item.mainhand.warrior-arming-sword');
    expect(equipment['offhand']?.defId).toBe('item.offhand.warrior-warded-shield');
    expect(character['currencies']).toEqual({ gold: 0, tickets: 0, luckyTickets: 0 });
  });

  it('migrates deterministically, so every device produces the same gear', () => {
    const first = migrate(V1_CHARACTER).record;
    const second = migrate(V1_CHARACTER).record;
    expect(first).toEqual(second);
    // And it matches the captured blob for the current version exactly.
    expect(first).toEqual({
      ...V5_CHARACTER,
      integrity: (first as { integrity: unknown }).integrity,
    });
  });

  it('leaves a v2 hero with no potions and two shelves waiting to be filled', () => {
    const { record, applied } = migrate(V2_CHARACTER);
    const character = (record as { character: Record<string, unknown> }).character;
    const merchants = character['merchants'] as Record<string, { stockedAt: number }>;

    expect(applied).toEqual([2, 3, 4]);
    expect(character['potions']).toEqual({});
    // Stamped at the epoch, so the first visit restocks at the hero's real
    // bracket rather than carrying one guessed at migration time (Q17).
    expect(merchants['equipment']?.stockedAt).toBe(0);
    expect(merchants['magic']?.stockedAt).toBe(0);
  });

  it('gives a v3 hero an empty board rather than a stale one (Q10)', () => {
    const { record } = migrate(V3_CHARACTER);
    const character = (record as { character: Record<string, unknown> }).character;
    const quests = character['quests'] as { daily: { periodKey: string; quests: unknown[] } };

    // Pre-rolling here would bake in a period key that may already be yesterday
    // by the time the save is opened; the first refresh does it properly.
    expect(quests.daily.periodKey).toBe('');
    expect(quests.daily.quests).toEqual([]);
  });

  it('opens a database written by an older build', async () => {
    setClock(createClock({ source: () => 1_700_000_120_000 }));
    const db = await openDatabase(`omf-fixture-${Math.random().toString(36).slice(2)}`);

    // Seed the database exactly as an older build left it.
    await db.put(STORES.meta, V1_META, META_KEY);
    await db.put(STORES.account, V1_ACCOUNT, ACCOUNT_KEY);
    await db.put(STORES.characters, V1_CHARACTER, characterKey(1));

    const save = createSaveLayer(db);

    // Meta and account shapes did not change in v2, but the record's version
    // still moves forward with the schema, so both report as migrated.
    expect((await save.loadMeta()).status).toBe('migrated');
    expect((await save.loadAccount()).record?.account.slotsUnlocked).toBe(1);

    const character = await save.loadCharacter(1);
    expect(character.status).toBe('migrated');
    expect(character.record?.character.identity.name).toBe('Grimhild');
    expect(character.record?.character.identity.classId).toBe('warrior');
    // The player's hero comes back armed, not empty-handed.
    expect(character.record?.character.equipment.mainhand).toBeDefined();

    db.close();
    setClock(createClock());
  });

  it('covers every schema version below the current one', () => {
    // A bump without a captured fixture fails here, which is the point: the
    // fixture has to be captured while the old build still exists to capture it.
    const covered = new Set(FIXTURES.map((fixture) => fixture.version));
    for (let version = 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
      expect(covered, `no captured fixtures for schema version ${version}`).toContain(version);
    }
  });
});

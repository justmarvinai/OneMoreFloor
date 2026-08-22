/**
 * Captured save blobs, schema version 2.
 *
 * v2 gave characters equipment, inventory, currencies and materials. This
 * character record was captured by running the real v1 → v2 migration over
 * `V1_CHARACTER` and stamping the result — so it is exactly what a player's save
 * looks like after updating, checksum included, rather than what we imagine it
 * looks like.
 *
 * The meta and account shapes did not change in v2, so `v1.ts` still covers them.
 */
import type { StoredRecord } from '../schema.ts';

export const V2_CHARACTER: StoredRecord = {
  schemaVersion: 2,
  character: {
    slotId: 1,
    identity: { name: 'Grimhild', classId: 'warrior', createdAt: 1_700_000_000_000 },
    progression: { level: 1, xp: 0, ascension: 0 },
    purchasedStats: { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 },
    tower: { currentRunFloor: 1, highestFloorEverCleared: 0, runSeed: 'run:1:8f2c1a0b' },
    equipment: {
      mainhand: {
        uid: 'start-warrior-0',
        defId: 'item.mainhand.warrior-arming-sword',
        rarity: 'common',
        level: 0,
        ascension: 0,
        affixes: [
          { stat: 'luck', value: 8 },
          { stat: 'speed', value: 3 },
        ],
        budget: 17,
        bracketAtDrop: 0,
      },
      offhand: {
        uid: 'start-warrior-1',
        defId: 'item.offhand.warrior-warded-shield',
        rarity: 'common',
        level: 0,
        ascension: 0,
        affixes: [{ stat: 'hp', value: 74 }],
        budget: 18.5,
        bracketAtDrop: 0,
      },
    },
    inventory: [],
    currencies: { gold: 0, tickets: 0, luckyTickets: 0 },
    materials: {},
  },
  integrity: { crc32: 'c3edef5e', writtenAt: 1_700_000_060_000, gen: 2 },
};

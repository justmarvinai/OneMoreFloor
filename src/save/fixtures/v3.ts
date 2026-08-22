/**
 * Captured save blobs, schema version 3.
 *
 * v3 gave characters their running potions and each merchant's shelf. This
 * record was captured by running the real v2 → v3 migration over `V2_CHARACTER`
 * and stamping the result, so it is exactly what a player's save looks like
 * after updating — checksum included — rather than what we imagine it looks like.
 *
 * The merchant shelves are stamped at the epoch on purpose: that reads as
 * overdue to `needsRestock`, so a migrated save fills both shops at the hero's
 * real bracket on the first visit instead of carrying a guessed one (Q17).
 *
 * The meta and account shapes did not change in v3, so `v1.ts` still covers them.
 */
import type { StoredRecord } from '../schema.ts';

export const V3_CHARACTER: StoredRecord = {
  schemaVersion: 3,
  character: {
    slotId: 1,
    identity: {
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: 1_700_000_000_000,
    },
    progression: {
      level: 1,
      xp: 0,
      ascension: 0,
    },
    purchasedStats: {
      strength: 0,
      defense: 0,
      hp: 0,
      resource: 0,
      luck: 0,
    },
    tower: {
      currentRunFloor: 1,
      highestFloorEverCleared: 0,
      runSeed: 'run:1:8f2c1a0b',
    },
    equipment: {
      mainhand: {
        uid: 'start-warrior-0',
        defId: 'item.mainhand.warrior-arming-sword',
        rarity: 'common',
        level: 0,
        ascension: 0,
        affixes: [
          {
            stat: 'luck',
            value: 8,
          },
          {
            stat: 'speed',
            value: 3,
          },
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
        affixes: [
          {
            stat: 'hp',
            value: 74,
          },
        ],
        budget: 18.5,
        bracketAtDrop: 0,
      },
    },
    inventory: [],
    currencies: {
      gold: 0,
      tickets: 0,
      luckyTickets: 0,
    },
    materials: {},
    potions: {},
    merchants: {
      equipment: {
        stockSeed: 'run:1:8f2c1a0b/shop:equipment:0',
        stockedAt: 0,
        bracketAtStock: 0,
        floorAtStock: 0,
        sold: [],
      },
      magic: {
        stockSeed: 'run:1:8f2c1a0b/shop:magic:0',
        stockedAt: 0,
        bracketAtStock: 0,
        floorAtStock: 0,
        sold: [],
      },
    },
  },
  integrity: {
    crc32: '8a1cf0a8',
  },
};

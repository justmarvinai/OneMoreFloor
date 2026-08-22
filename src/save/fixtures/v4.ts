/**
 * Captured save blobs, schema version 4.
 *
 * v4 gave characters their quest boards. Captured by running the real v3 → v4
 * migration over `V3_CHARACTER` and stamping the result, so it is exactly what a
 * player's save looks like after updating — checksum included.
 *
 * Both boards arrive empty on purpose: a board is rolled against the hero's own
 * depth and the current period, and the first thing the game does on opening a
 * character is refresh them (Q10).
 *
 * The meta and account shapes did not change in v4, so `v1.ts` still covers them.
 */
import type { StoredRecord } from '../schema.ts';

export const V4_CHARACTER: StoredRecord = {
  schemaVersion: 4,
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
    quests: {
      daily: {
        periodKey: '',
        quests: [],
      },
      weekly: {
        periodKey: '',
        quests: [],
      },
    },
  },
  integrity: {
    crc32: '4e09ce26',
  },
};

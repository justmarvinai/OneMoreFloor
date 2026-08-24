/**
 * Captured save blobs, schema version 7.
 *
 * v7 is the sixth round's whole shelf of new state in one step: accounts gained
 * echoes and the tree they buy, deed progress, a boss-rush record, expeditions
 * by slot and a stable of companions; characters gained talent ranks, an active
 * companion and — inside `tower` — the route chosen through each band of the run.
 *
 * Both blobs were captured by running the real migration ladder over the v1
 * fixtures and re-stamping, so they are exactly what a player's save looks like
 * after updating from any earlier version — checksum included.
 */
import type { StoredRecord } from '../schema.ts';

export const V7_CHARACTER: StoredRecord = {
  schemaVersion: 7,
  character: {
    slotId: 1,
    identity: {
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: 1700000000000,
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
      milestonesClaimed: [],
      history: [],
      autoClimb: 'off',
      runGold: 0,
      runFights: 0,
      pathChoices: {},
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
            value: 10,
          },
          {
            stat: 'speed',
            value: 3,
          },
        ],
        budget: 19.3,
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
            value: 83,
          },
        ],
        budget: 20.75,
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
    gachaPulls: 0,
    loadouts: [],
    wishlist: null,
    curses: [],
    talents: {},
    activePet: null,
  },
  integrity: {
    crc32: '613df228',
  },
};

export const V7_ACCOUNT: StoredRecord = {
  schemaVersion: 7,
  account: {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: false,
    backpackSlots: 20,
    bestiary: {},
    echoes: 0,
    echoesEarned: 0,
    echoNodes: {},
    deeds: {},
    deedsClaimed: [],
    bossRushBest: 0,
    expeditions: {},
    pets: {},
  },
  integrity: {
    crc32: '8639eadc',
  },
};

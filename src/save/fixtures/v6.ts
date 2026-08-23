/**
 * Captured save blobs, schema version 6.
 *
 * v6 is the fifth polish round's whole shelf of new state in one step: accounts
 * gained a backpack size and a bestiary; characters gained saved loadouts, a
 * rite wish list, curses, and — inside `tower` — milestones claimed, run
 * history, the auto-climb mode and the run's running totals.
 *
 * Both blobs were captured by running the real migration ladder over the v1
 * fixtures and re-stamping, so they are exactly what a player's save looks like
 * after updating from any earlier version — checksum included.
 *
 * The account record changes in v6, which is why this file carries one: v1.ts
 * has covered the account shape since M1 and no longer does.
 */
import type { StoredRecord } from '../schema.ts';

export const V6_CHARACTER: StoredRecord = {
  schemaVersion: 6,
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
  },
  integrity: {
    crc32: '66a6d517',
  },
};

export const V6_ACCOUNT: StoredRecord = {
  schemaVersion: 6,
  account: {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: false,
    backpackSlots: 20,
    bestiary: {},
  },
  integrity: {
    crc32: 'addea5cb',
  },
};

/**
 * Shape guards for persisted records.
 *
 * A checksum proves a record is *intact*; these prove it is *the thing we think
 * it is*. Both matter: an old build's bug, a hand-edited blob or a half-finished
 * migration can all produce data that hashes correctly and still cannot be
 * played. Anything that fails here goes down the recovery ladder rather than
 * into the game (SAVE_SCHEMA §6).
 */
import { CLASS_IDS, SLOT_IDS } from '@/domain/character/types.ts';
import type { StoredRecord } from './schema.ts';
import type { AccountRecord, CharacterRecord, MetaRecord } from './schema.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

export function isMetaRecord(record: StoredRecord): record is StoredRecord & MetaRecord {
  return (
    isFiniteNumber(record['createdAt']) &&
    isFiniteNumber(record['lastOpenedAt']) &&
    isFiniteNumber(record['lastKnownWallClock'])
  );
}

export function isAccountRecord(record: StoredRecord): record is StoredRecord & AccountRecord {
  const account = record['account'];
  if (!isObject(account)) return false;

  const activeSlot = account['activeSlotId'];
  const activeSlotOk =
    activeSlot === null || (SLOT_IDS as readonly number[]).includes(activeSlot as number);

  return (
    isNonNegativeInteger(account['battleSpeedTier']) &&
    (account['battleSpeedTier'] as number) <= 3 &&
    isNonNegativeInteger(account['slotsUnlocked']) &&
    (account['slotsUnlocked'] as number) >= 1 &&
    (account['slotsUnlocked'] as number) <= SLOT_IDS.length &&
    activeSlotOk &&
    typeof account['tutorialCompleted'] === 'boolean'
  );
}

export function isCharacterRecord(record: StoredRecord): record is StoredRecord & CharacterRecord {
  const character = record['character'];
  if (!isObject(character)) return false;

  const identity = character['identity'];
  const progression = character['progression'];
  const tower = character['tower'];
  const purchased = character['purchasedStats'];
  if (!isObject(identity) || !isObject(progression) || !isObject(tower) || !isObject(purchased)) {
    return false;
  }

  const classOk = (CLASS_IDS as readonly string[]).includes(identity['classId'] as string);
  const slotOk = (SLOT_IDS as readonly number[]).includes(character['slotId'] as number);
  const ascension = progression['ascension'];

  const currencies = character['currencies'];
  const merchants = character['merchants'];
  const belongingsOk =
    isObject(character['equipment']) &&
    Array.isArray(character['inventory']) &&
    isObject(character['materials']) &&
    isObject(character['potions']) &&
    isObject(character['quests']) &&
    typeof character['gachaPulls'] === 'number' &&
    isObject(merchants) &&
    isObject(merchants['equipment']) &&
    isObject(merchants['magic']) &&
    isObject(currencies) &&
    isNonNegativeInteger(currencies['gold']) &&
    isNonNegativeInteger(currencies['tickets']) &&
    isNonNegativeInteger(currencies['luckyTickets']);

  return (
    slotOk &&
    classOk &&
    belongingsOk &&
    typeof identity['name'] === 'string' &&
    identity['name'].length > 0 &&
    isFiniteNumber(identity['createdAt']) &&
    isNonNegativeInteger(progression['level']) &&
    (progression['level'] as number) >= 1 &&
    isNonNegativeInteger(progression['xp']) &&
    isNonNegativeInteger(ascension) &&
    (ascension as number) <= 5 &&
    isNonNegativeInteger(tower['currentRunFloor']) &&
    (tower['currentRunFloor'] as number) >= 1 &&
    isNonNegativeInteger(tower['highestFloorEverCleared']) &&
    typeof tower['runSeed'] === 'string' &&
    ['strength', 'defense', 'hp', 'resource', 'luck'].every((stat) =>
      isNonNegativeInteger(purchased[stat]),
    )
  );
}

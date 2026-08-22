/**
 * Character and account vocabulary.
 *
 * These are the shapes the game reasons about; `save/schema.ts` persists them.
 * The direction matters: domain never imports save (ARCHITECTURE §3), so the
 * game's model is defined once here and the save layer follows it.
 */
import type { GrowableStats } from '../stats.ts';

/** The five classes of EA 0.1 (Brief §8). No sixth without a brief change. */
export const CLASS_IDS = ['warrior', 'mage', 'hunter', 'bard', 'swashbuckler'] as const;
export type ClassId = (typeof CLASS_IDS)[number];

/** Class resource pools (Brief §8.1). */
export type ResourceKind = 'rage' | 'mana' | 'focus';

/**
 * How a class fills its weapon slots (Brief §8.1, resolved by Q15):
 * - `two_handed` — Mainhand holds a 2H weapon; Offhand is blocked, not empty.
 * - `one_hand_shield_or_two_handed` — the Warrior's choice of loadout.
 * - `dual_one_handed` — a 1H weapon in each hand.
 */
export type WeaponRule = 'two_handed' | 'one_hand_shield_or_two_handed' | 'dual_one_handed';

/** Equipment slots (Brief §9.1). Ascension unlocks the last five (§7). */
export const EQUIP_SLOT_IDS = [
  'helmet',
  'chest',
  'leggings',
  'boots',
  'gauntlets',
  'cape',
  'wrists',
  'mainhand',
  'offhand',
  'ring',
  'necklace',
  'amulet',
  'relic',
  'artifact',
] as const;
export type EquipSlotId = (typeof EQUIP_SLOT_IDS)[number];

/** Hero ascension tiers (Brief §7). Five is the maximum. */
export type AscensionTier = 0 | 1 | 2 | 3 | 4 | 5;

/** Character slots (Brief §19). Five is the maximum, unlocked by §15.2. */
export type SlotId = 1 | 2 | 3 | 4 | 5;
export const SLOT_IDS: readonly SlotId[] = [1, 2, 3, 4, 5];

export interface CharacterIdentity {
  /** The hero's name. Naming the hero *is* the account (Brief §5). */
  name: string;
  classId: ClassId;
  createdAt: number;
}

export interface CharacterProgression {
  level: number;
  xp: number;
  ascension: AscensionTier;
}

export interface TowerProgress {
  /** Where this run has reached. Resets to 1 on death (Brief §3.3). */
  currentRunFloor: number;
  /** The persistent record death never touches (Brief §3.4). */
  highestFloorEverCleared: number;
  /** Seed for the current run, so a run's floors are stable (ARCHITECTURE §5). */
  runSeed: string;
}

/**
 * A character as the game reasons about it. Equipment, inventory, currencies and
 * quests join this as their milestones land (ROADMAP M2+); each addition bumps
 * the save schema and ships its migration (SAVE_SCHEMA §4).
 */
export interface Character {
  slotId: SlotId;
  identity: CharacterIdentity;
  progression: CharacterProgression;
  /** Points bought with gold, per stat. Speed is not expressible here (§6). */
  purchasedStats: GrowableStats;
  tower: TowerProgress;
}

/** Battle Speed tiers (Brief §15.1, shaped by Q19): x1 → x2 → x4 → x8. */
export type BattleSpeedTier = 0 | 1 | 2 | 3;

/**
 * Account-wide state. Per Q4 these upgrades belong to the *account*: they are
 * bought once for every slot and survive a character reset untouched.
 */
export interface Account {
  battleSpeedTier: BattleSpeedTier;
  /** How many of the five character slots are unlocked (Brief §15.2). */
  slotsUnlocked: number;
  /** The character currently being played — one at a time (Q2). */
  activeSlotId: SlotId | null;
  /** The tutorial's one-time reward is per account (Brief §18). */
  tutorialCompleted: boolean;
}

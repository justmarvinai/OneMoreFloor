/**
 * Character and account vocabulary.
 *
 * These are the shapes the game reasons about; `save/schema.ts` persists them.
 * The direction matters: domain never imports save (ARCHITECTURE §3), so the
 * game's model is defined once here and the save layer follows it.
 */
import type { ItemInstance } from '../items/types.ts';
import type { MerchantsState } from '../merchants/types.ts';
import type { ActivePotions } from '../potions/potions.ts';
import type { QuestsState } from '../quests/types.ts';
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

/** How the tower climbs itself while the player watches, or does not. */
export type AutoClimbMode = 'off' | 'watching' | 'background';

/**
 * A finished run, kept so a death is data rather than only a setback.
 *
 * Trimmed to what a history list actually shows: nobody wants a replay, they
 * want to see whether they are getting further and what keeps stopping them.
 */
export interface RunRecord {
  /** Deepest floor cleared in that run. */
  floor: number;
  /** When it ended, from the clock service. */
  endedAt: number;
  /** Enemy id that ended it, absent when the run was abandoned rather than lost. */
  killedBy?: string;
  /** The floor the fatal fight was on. */
  diedOn: number;
  /** Gold banked across the whole run. */
  gold: number;
  /** Fights resolved in the run, raids included. */
  fights: number;
}

export interface TowerProgress {
  /** Where this run has reached. Resets to 1 on death (Brief §3.3). */
  currentRunFloor: number;
  /** The persistent record death never touches (Brief §3.4). */
  highestFloorEverCleared: number;
  /** Seed for the current run, so a run's floors are stable (ARCHITECTURE §5). */
  runSeed: string;
  /**
   * Milestone floors whose chest has been taken. Milestones are per *record*
   * rather than per run — the tower runs strictly upward (Q23), so a floor
   * cleared for the first time is the only moment one can be earned.
   */
  milestonesClaimed: number[];
  /** Finished runs, newest first and capped. */
  history: RunRecord[];
  /** Whether the tower is climbing itself, and whether the player is watching. */
  autoClimb: AutoClimbMode;
  /** Gold and fights banked in the run so far, for the record it becomes. */
  runGold: number;
  runFights: number;
}

/**
 * A saved gear set (§9.1 has fourteen sockets; swapping by hand is fourteen
 * drags).
 *
 * Pieces are held by uid rather than copied: a preset is a *reference* to gear
 * the hero owns, so selling a piece cannot leave a preset holding a ghost — it
 * simply has one fewer socket to fill when applied.
 */
export interface Loadout {
  name: string;
  equipment: Partial<Record<EquipSlotId, string>>;
}

/**
 * What the player owns. Gold is the only currency in the game (Q1); tickets are
 * gacha currency, not money (Brief §16.1).
 */
export interface Currencies {
  gold: number;
  tickets: number;
  luckyTickets: number;
}

/**
 * A character as the game reasons about it. Quest progress joins this as its
 * milestone lands; each addition bumps the save schema and ships its migration
 * (SAVE_SCHEMA §4).
 */
export interface Character {
  slotId: SlotId;
  identity: CharacterIdentity;
  progression: CharacterProgression;
  /** Points bought with gold, per stat. Speed is not expressible here (§6). */
  purchasedStats: GrowableStats;
  tower: TowerProgress;
  /** What is worn. Absent slots are empty — or locked, at this ascension (§7). */
  equipment: Partial<Record<EquipSlotId, ItemInstance>>;
  /** The backpack (Q16). Its capacity is a balance value, not a type. */
  inventory: ItemInstance[];
  currencies: Currencies;
  /** Gear-ascension materials, by material id (Brief §10.2). */
  materials: Record<string, number>;
  /**
   * Potions running right now (Brief §12, Q18). Keyed by stat, so a second
   * potion on the same stat replaces the first rather than stacking — and Speed
   * cannot appear here at all (§6).
   */
  potions: ActivePotions;
  /** Each merchant's shelf, stored as the seed it regenerates from (Q17). */
  merchants: MerchantsState;
  /**
   * The daily and weekly boards, keyed by the period they belong to (Brief §17,
   * Q10). Quests are per character rather than per account: the targets scale to
   * *this* hero's depth, so a level-3 second character would inherit a
   * veteran's impossible weekly otherwise.
   */
  quests: QuestsState;
  /**
   * How many gacha pulls this hero has made (Brief §16). It is a *seed input*,
   * not a statistic: each pull draws from a stream named by this number, so a
   * save plus a pull number reproduces exactly what came out (ARCHITECTURE §5).
   * There is no pity counter in 0.1 (Q20) and this is not one.
   */
  gachaPulls: number;
  /** Saved gear sets, newest last. */
  loadouts: Loadout[];
  /**
   * The socket the rites should favour when they pay in gear.
   *
   * Not a pity counter and not a guarantee (Q20): it re-rolls the *slot* of a
   * gear prize, never its rarity or its budget, so the odds printed on the rate
   * table stay exactly true.
   */
  wishlist: EquipSlotId | null;
  /**
   * Curses the player has taken on: harder enemies for better loot (§13's
   * bracket still binds — a curse widens what the tower *offers*, never what an
   * item may be worth).
   */
  curses: string[];
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
  /**
   * Backpack size, bought in steps (§15 — the owner added this upgrade in the
   * fifth polish round; see USER_QUESTIONS Q30).
   */
  backpackSlots: number;
  /**
   * Enemies this account has beaten, by id, with how many times. Per account
   * rather than per character: a bestiary is a collection, and a collection that
   * a hero's reset erases is not one (§3.3 destroys nothing owned).
   */
  bestiary: Record<string, number>;
}

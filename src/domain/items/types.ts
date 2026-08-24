/**
 * Item vocabulary.
 *
 * The distinction that carries the whole system: an **`ItemDef`** is content — a
 * base type like "iron cuirass", authored once — while an **`ItemInstance`** is
 * what a player owns, carrying only its *rolls*. Derived numbers are never
 * stored: they are recomputed from current formulas every time, so a balance
 * patch applies to gear people already own without a migration (SAVE_SCHEMA §3).
 */
import type { ClassId, EquipSlotId } from '../character/types.ts';
import type { UniquePowerId } from '@/content/items/uniques.ts';
import type { StatId } from '../stats.ts';

/** Rarity tiers (Brief §9.2). `mythic` matches FantasyUI's own rarity ids. */
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type Rarity = (typeof RARITIES)[number];

export function rarityIndex(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}

/**
 * How a weapon occupies hands (Brief §8.1, Q15). Armour and accessories carry no
 * weapon kind — they never contend for a hand.
 */
export type WeaponKind = 'one_handed' | 'two_handed' | 'shield';

export const GEAR_LEVEL_MAX = 15;
export const GEAR_ASCENSION_MAX = 5;

export type GearAscension = 0 | 1 | 2 | 3 | 4 | 5;

/** A rolled stat on an item (Brief §10.2). */
export interface Affix {
  stat: StatId;
  /** The rolled value at gear level 0. Level and ascension scale it from here. */
  value: number;
}

/**
 * A base item type. Content authors these; the generator never invents one.
 */
export interface ItemDef {
  id: string;
  slot: EquipSlotId;
  nameKey: string;
  /** Icon asset id (Q27): a curated FantasyUI icon until real item art exists. */
  icon: string;
  /** Class-exclusive for weapons; null for armour and accessories (Brief §8.2). */
  classId: ClassId | null;
  weaponKind?: WeaponKind;
  /**
   * Which affix pool this base rolls from. Accessories use the offense/defense
   * split that distinguishes Necklace from Amulet (Q5).
   */
  affixPool: AffixPoolId;
  /**
   * Bracket range this base appears in, as `[min, max]` bracket indices. A rusty
   * dagger stops dropping once the player is fighting on floor 400.
   */
  brackets: [number, number];
  /**
   * The set this base belongs to (Q45), if any.
   *
   * On the *base* rather than rolled onto an instance, so an Ironbound Helm
   * found on floor 12 and one found on floor 1,200 are the same piece sized for
   * different depths — which is what lets a set stay worth chasing in a tower
   * with no top.
   */
  setId?: string;
  /**
   * The rules this base carries (Q45). A base with one is a *unique*: it comes
   * through the same generator as everything else, so §13 binds it, but it is
   * not in the pool until the rarity roll has already reached
   * `UNIQUE_MIN_RARITY` — which keeps the printed rate table true.
   */
  unique?: UniquePowerId;
  /**
   * Relative likelihood against the other bases eligible for the same slot.
   * Absent means one. Set pieces and uniques sit below it so a named piece stays
   * something you remember finding.
   */
  weight?: number;
}

export type AffixPoolId =
  | 'armor'
  | 'weapon_melee'
  | 'weapon_ranged'
  | 'weapon_magic'
  | 'shield'
  | 'accessory_offense'
  | 'accessory_defense';

/**
 * An owned item.
 *
 * `budget` and `bracketAtDrop` are stamped at creation and never change: together
 * they are the audit trail proving the anti-overshoot rule held for every item in
 * a real save (Brief §13, BALANCE.md §6).
 */
export interface ItemInstance {
  /** Instance identity, unique within a character's belongings. */
  uid: string;
  defId: string;
  rarity: Rarity;
  /** Gear level 0–15 (Brief §10.1). */
  level: number;
  /** Gear ascension 0–5 stars (Brief §10.2). */
  ascension: GearAscension;
  affixes: Affix[];
  /** Total stat budget this item was generated with. */
  budget: number;
  /** The Power-Level bracket that produced it. */
  bracketAtDrop: number;
}

/** Materials for gear ascension (Brief §10.2), tiered by depth. */
export interface MaterialDef {
  id: string;
  nameKey: string;
  icon: string;
  /** Tier 1 is shallow-floor material; higher tiers come from deeper bands. */
  tier: number;
}

/** A material requirement, as `{ materialId: count }`. */
export type MaterialCost = Readonly<Record<string, number>>;

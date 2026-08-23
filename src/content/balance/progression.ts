/**
 * Progression tables — hero ascension, level caps and the slots ascension opens.
 *
 * These are the brief's own numbers (§7), transcribed once so no screen or rule
 * hardcodes them. Everything tunable in the game lives under `src/content/`; a
 * literal like these appearing inside `src/domain/` is a review-blocking bug
 * (Brief §3.7, CLAUDE.md).
 */
import type { AscensionTier, EquipSlotId } from '@/domain/character/types.ts';

export interface AscensionStep {
  tier: AscensionTier;
  /**
   * Highest level reachable at this tier. Ascension 5 is uncapped (§7 "Endless"),
   * expressed as Infinity so comparisons stay ordinary arithmetic.
   */
  levelCap: number;
  /** The equipment slot this tier unlocks, if any (§7). */
  unlocksSlot: EquipSlotId | null;
}

export const ASCENSION_STEPS: readonly AscensionStep[] = [
  { tier: 0, levelCap: 100, unlocksSlot: null },
  { tier: 1, levelCap: 250, unlocksSlot: 'ring' },
  { tier: 2, levelCap: 500, unlocksSlot: 'necklace' },
  { tier: 3, levelCap: 750, unlocksSlot: 'amulet' },
  { tier: 4, levelCap: 1000, unlocksSlot: 'relic' },
  { tier: 5, levelCap: Infinity, unlocksSlot: 'artifact' },
];

export const MAX_ASCENSION: AscensionTier = 5;

/** Slots available from level 1 at ascension 0 (Brief §9.1). */
export const BASE_EQUIP_SLOTS: readonly EquipSlotId[] = [
  'helmet',
  'chest',
  'leggings',
  'boots',
  'gauntlets',
  'cape',
  'wrists',
  'mainhand',
  'offhand',
];

/** Character slots: the first is free, the rest are bought (Brief §15.2, §19). */
export const MAX_CHARACTER_SLOTS = 5;
export const STARTING_CHARACTER_SLOTS = 1;

/** Battle Speed multipliers by tier (Brief §15.1, tiering per Q19). */
export const BATTLE_SPEED_MULTIPLIERS: readonly number[] = [1, 2, 4, 8];

/**
 * XP required to go from `level` to `level + 1`.
 *
 * **Exponential at the same rate the tower pays experience** (M9). It was
 * polynomial, and polynomial cost against exponential income is a race the
 * player wins by default: the first M9 measurement had heroes at the level-100
 * ascension cap inside three sittings. Matching the rates makes level track
 * *depth* instead of outrunning it, so a level-up stays one of the small rewards
 * that make a session feel productive (Brief §1) rather than a formality.
 *
 * The knee factor steepens things past each ascension cap, so ascension stays a
 * real wall rather than a checkbox.
 */
export const XP_TO_NEXT_LEVEL = {
  kind: 'exponential',
  base: 130,
  factor: 1.66,
  period: 10,
} as const;

/** Extra XP multiplier per hero-ascension tier already earned. */
export const XP_ASCENSION_KNEE = 1.85;

/**
 * Gold cost of the *n*-th purchased point in a stat (Brief §6, assumption A2).
 *
 * Unbounded and exponential: there is always another point in reach, and it is
 * always slightly more than the player has (Brief §14). Speed is absent by type
 * — gear is its only source (§6) — so it is impossible to price it here.
 */
export const STAT_UPGRADE_COST = { base: 22, factor: 1.9, period: 12 } as const;

/** Per-stat price multiplier: health is cheap per point, luck expensive. */
export const STAT_UPGRADE_MULTIPLIER = {
  strength: 1,
  defense: 1,
  hp: 0.35,
  resource: 0.9,
  luck: 1.6,
} as const;

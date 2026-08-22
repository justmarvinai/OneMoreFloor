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

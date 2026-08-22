/**
 * Levels, XP and hero ascension (Brief §7).
 *
 * The level cap is a real wall: XP earned at the cap is discarded rather than
 * banked (assumption A3), so reaching it is a prompt to ascend rather than
 * something that quietly resolves itself. Ascension raises the cap and unlocks an
 * equipment slot — the two rewards that make the wall worth walking up to.
 */
import { evaluate } from '@/content/balance/curves.ts';
import { XP_ASCENSION_KNEE, XP_TO_NEXT_LEVEL } from '@/content/balance/progression.ts';
import { canAscend, levelCapFor } from '../character/character.ts';
import { MAX_ASCENSION, ASCENSION_STEPS } from '@/content/balance/progression.ts';
import type { AscensionTier, Character, EquipSlotId } from '../character/types.ts';

/** XP needed to go from `level` to `level + 1` at this ascension tier. */
export function xpToNextLevel(level: number, ascension: AscensionTier): number {
  const base = evaluate({ kind: 'polynomial', ...XP_TO_NEXT_LEVEL }, Math.max(1, level));
  return Math.round(base * Math.pow(XP_ASCENSION_KNEE, ascension));
}

export interface LevelUpResult {
  character: Character;
  /** How many levels were gained. */
  levelsGained: number;
  /** XP discarded because the character is sitting at their cap (A3). */
  xpWasted: number;
  /** True when the character has just reached the cap and may ascend. */
  atCap: boolean;
}

/**
 * Award XP, applying as many level-ups as it covers.
 *
 * Loops rather than solving in closed form because the requirement changes with
 * every level; a big reward from a deep floor can carry several levels at once,
 * which should feel like several level-ups, not one.
 */
export function awardXp(character: Character, amount: number): LevelUpResult {
  if (amount <= 0) {
    return { character, levelsGained: 0, xpWasted: 0, atCap: canAscend(character) };
  }

  const cap = levelCapFor(character.progression.ascension);
  let { level, xp } = character.progression;
  let remaining = amount;
  let levelsGained = 0;
  let xpWasted = 0;

  while (remaining > 0) {
    if (level >= cap) {
      // At the cap, XP has nowhere to go: ascending is the only way forward (A3).
      xpWasted += remaining;
      break;
    }

    const needed = xpToNextLevel(level, character.progression.ascension) - xp;
    if (remaining < needed) {
      xp += remaining;
      break;
    }

    remaining -= needed;
    level += 1;
    xp = 0;
    levelsGained += 1;
  }

  const next: Character = {
    ...character,
    progression: { ...character.progression, level, xp },
  };

  return { character: next, levelsGained, xpWasted, atCap: canAscend(next) };
}

export interface AscendResult {
  character: Character;
  /** The slot this ascension opened, if any (Brief §7). */
  unlockedSlot: EquipSlotId | null;
  newLevelCap: number;
}

/**
 * Ascend the hero (Brief §7). A deliberate action, not an automatic one (A3):
 * the player presses it, and it is one of the game's landmark moments.
 *
 * Level and XP are untouched — ascension raises the ceiling, it does not reset
 * the climb. Nothing owned is lost, ever (§3.3).
 */
export function ascendHero(character: Character): AscendResult | null {
  if (!canAscend(character)) return null;

  const tier = (character.progression.ascension + 1) as AscensionTier;
  const step = ASCENSION_STEPS[tier];

  return {
    character: {
      ...character,
      progression: { ...character.progression, ascension: tier },
    },
    unlockedSlot: step?.unlocksSlot ?? null,
    newLevelCap: levelCapFor(tier),
  };
}

/** Progress towards the next level, 0–1. At the cap this is 1. */
export function levelProgress(character: Character): number {
  const cap = levelCapFor(character.progression.ascension);
  if (character.progression.level >= cap) return 1;
  const needed = xpToNextLevel(character.progression.level, character.progression.ascension);
  return needed <= 0 ? 1 : Math.min(1, character.progression.xp / needed);
}

export { MAX_ASCENSION };

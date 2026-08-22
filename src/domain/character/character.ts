/**
 * Character creation and the rules that read a character's state.
 *
 * Pure functions over data: no clock, no randomness, no persistence. Callers pass
 * in the values that come from outside (the creation time, the run seed), which
 * is what lets every rule here be tested by calling it (ARCHITECTURE §3).
 */
import { ASCENSION_STEPS, MAX_ASCENSION } from '@/content/balance/progression.ts';
import { getClass } from '@/content/classes/index.ts';
import { toStatBlock, type GrowableStats, type StatBlock } from '../stats.ts';
import { normalizeName } from './naming.ts';
import type { AscensionTier, Character, ClassId, EquipSlotId, SlotId } from './types.ts';

export interface CreateCharacterInput {
  slotId: SlotId;
  name: string;
  classId: ClassId;
  /** From the clock service — creation never reads the time itself. */
  createdAt: number;
  /** Seed for the character's first tower run (ARCHITECTURE §5). */
  runSeed: string;
}

/**
 * A brand-new hero: level 1, ascension 0, floor 1, nothing bought.
 *
 * Starting equipment (Brief §5, Q15) is granted when the item system lands in
 * M2 — a character with no items is not a character with placeholder items.
 */
export function createCharacter(input: CreateCharacterInput): Character {
  return {
    slotId: input.slotId,
    identity: {
      name: normalizeName(input.name),
      classId: input.classId,
      createdAt: input.createdAt,
    },
    progression: { level: 1, xp: 0, ascension: 0 },
    purchasedStats: { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 },
    tower: { currentRunFloor: 1, highestFloorEverCleared: 0, runSeed: input.runSeed },
  };
}

/** The level cap at an ascension tier. Tier 5 is uncapped (Brief §7). */
export function levelCapFor(ascension: AscensionTier): number {
  return ASCENSION_STEPS[ascension].levelCap;
}

/** True when the hero has hit their cap and may ascend (Brief §7). */
export function canAscend(character: Character): boolean {
  const { level, ascension } = character.progression;
  if (ascension >= MAX_ASCENSION) return false;
  return level >= levelCapFor(ascension);
}

/** Equipment slots unlocked at an ascension tier (Brief §7/§9.1). */
export function unlockedSlotsAt(ascension: AscensionTier): EquipSlotId[] {
  return ASCENSION_STEPS.slice(0, ascension + 1)
    .map((step) => step.unlocksSlot)
    .filter((slot): slot is EquipSlotId => slot !== null);
}

/**
 * Stats from class, level and purchased points — everything except gear.
 *
 * Growth is fractional per level and floored once at the end, so a class with
 * 1.6 Strength per level gains ground steadily instead of losing the remainder
 * every level. Speed is absent throughout: gear is its only source (Brief §6).
 */
export function baseStatsOf(character: Character): StatBlock {
  const definition = getClass(character.identity.classId);
  const levels = character.progression.level - 1;

  const grown: GrowableStats = {
    strength: 0,
    defense: 0,
    hp: 0,
    resource: 0,
    luck: 0,
  };

  for (const stat of Object.keys(grown) as (keyof GrowableStats)[]) {
    const fromLevels = definition.baseStats[stat] + definition.statGrowthPerLevel[stat] * levels;
    grown[stat] = Math.floor(fromLevels) + character.purchasedStats[stat];
  }

  return toStatBlock(grown);
}

/** A short "Level 12 Warrior"-style descriptor, as data for the string layer. */
export interface CharacterSummary {
  slotId: SlotId;
  name: string;
  classId: ClassId;
  level: number;
  ascension: AscensionTier;
  highestFloorEverCleared: number;
}

export function summarize(character: Character): CharacterSummary {
  return {
    slotId: character.slotId,
    name: character.identity.name,
    classId: character.identity.classId,
    level: character.progression.level,
    ascension: character.progression.ascension,
    highestFloorEverCleared: character.tower.highestFloorEverCleared,
  };
}

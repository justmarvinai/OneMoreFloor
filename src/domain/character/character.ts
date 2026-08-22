/**
 * Character creation and the rules that read a character's state.
 *
 * Pure functions over data: no clock, no randomness, no persistence. Callers pass
 * in the values that come from outside (the creation time, the run seed), which
 * is what lets every rule here be tested by calling it (ARCHITECTURE §3).
 */
import { createRng } from '@/app/rng.ts';
import { ASCENSION_STEPS, MAX_ASCENSION } from '@/content/balance/progression.ts';
import { getClass } from '@/content/classes/index.ts';
import { equipmentStats } from '../items/derive.ts';
import { createStartingEquipment } from '../items/starting.ts';
import type { ItemInstance } from '../items/types.ts';
import { createMerchants } from '../merchants/merchants.ts';
import { potionBonus } from '../potions/potions.ts';
import { emptyQuests } from '../quests/quests.ts';
import { addStats, toStatBlock, type GrowableStats, type StatBlock } from '../stats.ts';
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
 * A brand-new hero: level 1, ascension 0, floor 1, nothing bought, and holding
 * exactly their class weapon (Brief §5) — every other slot empty, which is the
 * game's opening question to the player.
 *
 * The starting gear is rolled from the run seed, so re-creating the same hero
 * produces the same first weapon.
 */
export function createCharacter(input: CreateCharacterInput): Character {
  const rng = createRng(`${input.runSeed}/creation`);

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
    equipment: createStartingEquipment(input.classId, rng),
    inventory: [],
    currencies: { gold: 0, tickets: 0, luckyTickets: 0 },
    materials: {},
    potions: {},
    merchants: createMerchants(input.runSeed, input.createdAt),
    // Empty until the first refresh: a board is rolled against the hero's own
    // depth, and at creation they have not climbed anything yet.
    quests: emptyQuests(),
  };
}

/** Everything currently worn, as a flat list. */
export function equippedItems(character: Character): ItemInstance[] {
  return Object.values(character.equipment).filter(
    (item): item is ItemInstance => item !== undefined,
  );
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

/**
 * Everything the hero durably has: class, levels, purchases *and* gear.
 *
 * Speed can only ever be non-zero here because something is equipped — the type
 * system guarantees no other path exists (§6).
 *
 * Potions are deliberately absent. This block feeds Power Level, and a drinkable
 * bracket jump would let a player potion up, pull better loot and let the potion
 * lapse — the overshoot §13 exists to prevent. What the hero *fights* with is
 * `combatStatsOf`.
 */
export function totalStatsOf(character: Character): StatBlock {
  return addStats(baseStatsOf(character), equipmentStats(equippedItems(character)));
}

/**
 * What the hero swings with right now: everything durable, plus whatever
 * potions are still running at `now` (Brief §12, Q9).
 *
 * The time comes from the caller — the clock service, never `Date.now()` — so a
 * fight resolved from a save replays exactly (ARCHITECTURE §5).
 */
export function combatStatsOf(character: Character, now: number): StatBlock {
  const durable = totalStatsOf(character);
  return addStats(durable, potionBonus(durable, character.potions, now));
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

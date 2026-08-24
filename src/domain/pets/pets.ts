/**
 * Companions (Q42) — finding them, levelling them, and what they bring.
 *
 * A companion is a **fraction of the hero it walks beside**. Its stats are read
 * off theirs rather than rolled, which settles three questions at once: it never
 * needs gear, it never needs a bracket of its own (so §13 has nothing to police
 * here), and it never goes obsolete twenty floors after it is found.
 *
 * Two things are per-account and one is per-character, and the split is the
 * point: the **roster and its levels** belong to the account, so a hero's death
 * costs none of it (§3.3), while **which one is out** belongs to the character,
 * so two heroes on one account can field different companions.
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  PET_AURA,
  PET_MAX_LEVEL,
  PET_SCALE,
  PET_TAUNT_CAP,
  PET_XP_PER_FLOOR,
  PET_XP_TO_NEXT,
  POWER_PER_PET_LEVEL,
} from '@/content/balance/pets.ts';
import { getPet, PETS, type PetAura, type PetDef } from '@/content/pets/index.ts';
import type { Account, Character, PetProgress } from '../character/types.ts';
import type { EffectDef } from '../combat/types.ts';
import { emptyStatBlock, type StatBlock } from '../stats.ts';

export { PET_MAX_LEVEL, PETS };
export type { PetDef };

/** A companion the account owns, and how far it has come. */
export interface OwnedPet {
  def: PetDef;
  level: number;
  xp: number;
  /** Experience to the next level, or null at the ceiling. */
  toNext: number | null;
}

/** Clamp a stored level into the range the arithmetic can describe. */
function levelOf(progress: PetProgress | undefined): number {
  return Math.max(1, Math.min(PET_MAX_LEVEL, Math.floor(progress?.level ?? 1)));
}

/** Experience to go from `level` to the next. Null at the ceiling. */
export function petXpToNext(level: number): number | null {
  return level >= PET_MAX_LEVEL ? null : Math.round(evaluate(PET_XP_TO_NEXT, level));
}

/** Experience a cleared floor gives the companion that fought on it. */
export function petXpForFloor(floor: number): number {
  return Math.max(1, Math.round(evaluate(PET_XP_PER_FLOOR, Math.max(1, floor))));
}

/** The whole roster the account owns, in the order the tower gives them up. */
export function ownedPets(account: Pick<Account, 'pets'> | null | undefined): OwnedPet[] {
  const held = account?.pets ?? {};
  const owned: OwnedPet[] = [];

  for (const def of PETS) {
    const progress = held[def.id];
    if (!progress) continue;
    const level = levelOf(progress);
    owned.push({
      def,
      level,
      xp: Math.max(0, Math.floor(progress.xp)),
      toNext: petXpToNext(level),
    });
  }
  return owned;
}

/** One owned companion, or null when the account has never found it. */
export function ownedPet(
  account: Pick<Account, 'pets'> | null | undefined,
  id: string | null,
): OwnedPet | null {
  if (!id) return null;
  return ownedPets(account).find((pet) => pet.def.id === id) ?? null;
}

/** The companion this hero currently has out, if any. */
export function activePetOf(
  account: Pick<Account, 'pets'> | null | undefined,
  character: Pick<Character, 'activePet'> | null | undefined,
): OwnedPet | null {
  return ownedPet(account, character?.activePet ?? null);
}

/**
 * Species a floor this deep frees that the account has not met yet.
 *
 * Returned rather than applied, because finding one is worth announcing and the
 * caller is the only thing that knows how to say so.
 */
export function petsFoundAt(account: Pick<Account, 'pets'>, floor: number): PetDef[] {
  return PETS.filter((def) => def.unlockFloor <= floor && account.pets[def.id] === undefined);
}

/** Add newly-found species to the roster at level one. */
export function grantPets(account: Account, found: readonly PetDef[]): Account {
  if (found.length === 0) return account;

  const pets = { ...account.pets };
  for (const def of found) pets[def.id] = { level: 1, xp: 0 };
  return { ...account, pets };
}

export interface PetLevelUp {
  account: Account;
  /** How many levels the experience carried. */
  levelsGained: number;
}

/**
 * Award experience to the companion that fought.
 *
 * Loops rather than solving in closed form, for the same reason hero levels do:
 * a deep floor can carry several levels at once, and each one should be a level.
 */
export function awardPetXp(account: Account, id: string | null, amount: number): PetLevelUp {
  const progress = id === null ? undefined : account.pets[id];
  if (!id || !progress || amount <= 0) return { account, levelsGained: 0 };

  let level = levelOf(progress);
  let xp = Math.max(0, Math.floor(progress.xp)) + Math.floor(amount);
  let levelsGained = 0;

  for (;;) {
    const needed = petXpToNext(level);
    // At the ceiling the surplus is discarded rather than banked: a bar that
    // fills forever behind a level that never comes explains nothing.
    if (needed === null) {
      xp = 0;
      break;
    }
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    levelsGained += 1;
  }

  return {
    account: { ...account, pets: { ...account.pets, [id]: { level, xp } } },
    levelsGained,
  };
}

export type PetRefusal = 'noSuchPet' | 'notFound';

/** Send a companion out, or call it back in. Refuses one never found. */
export function setActivePet(
  account: Pick<Account, 'pets'>,
  character: Character,
  id: string | null,
): Character | PetRefusal {
  if (id === null) return { ...character, activePet: null };
  if (!getPet(id)) return 'noSuchPet';
  if (account.pets[id] === undefined) return 'notFound';
  return { ...character, activePet: id };
}

/**
 * What share of the hero a companion fights with at this level.
 *
 * Linear between the two ends rather than a curve, so "is levelling this worth
 * it?" is a question a player can answer by looking at the bar.
 */
export function petScale(level: number): number {
  const held = Math.max(1, Math.min(PET_MAX_LEVEL, level));
  const span = Math.max(1, PET_MAX_LEVEL - 1);
  const t = (held - 1) / span;
  return PET_SCALE.atLevelOne + (PET_SCALE.atMaxLevel - PET_SCALE.atLevelOne) * t;
}

/**
 * The companion's own stat block, read off the hero's.
 *
 * Resource is zero on purpose: companions have no signature move. The bar is the
 * hero's tempo dial (Q26), and a second one ticking beside it would make the
 * fight harder to read for no decision gained.
 */
export function petStats(heroStats: StatBlock, pet: OwnedPet): StatBlock {
  const scale = petScale(pet.level);
  const stats = emptyStatBlock();

  stats.strength = Math.max(1, Math.round(heroStats.strength * pet.def.ratios.strength * scale));
  stats.defense = Math.max(0, Math.round(heroStats.defense * pet.def.ratios.defense * scale));
  stats.hp = Math.max(1, Math.round(heroStats.hp * pet.def.ratios.hp * scale));
  stats.luck = Math.max(0, Math.round(heroStats.luck * pet.def.ratios.luck * scale));
  stats.speed = Math.max(0, Math.round(heroStats.speed * pet.def.ratios.speed * scale));
  return stats;
}

/** How much of the enemy's attention this companion holds. */
export function petTaunt(pet: OwnedPet): number {
  return Math.max(0, Math.min(PET_TAUNT_CAP, pet.def.taunt));
}

/** What one companion's aura is worth right now, in the aura's own units. */
export function auraMagnitude(pet: OwnedPet): number {
  return pet.def.aura.kind === 'damageReduction'
    ? Math.min(PET_AURA.damageReductionCap, pet.level * PET_AURA.damageReduction)
    : pet.level * PET_AURA.statScale;
}

/**
 * The aura, as the effect the engine already knows how to apply.
 *
 * Expressed as an ordinary whole-fight buff rather than a new rule: the combat
 * model has exactly one vocabulary for "this unit is changed for the fight", and
 * a companion earning a second one would be a second thing to keep correct.
 */
export function auraEffect(pet: OwnedPet): EffectDef {
  const magnitude = auraMagnitude(pet);
  const aura: PetAura = pet.def.aura;

  if (aura.kind === 'damageReduction') {
    return {
      id: `aura:${pet.def.id}`,
      nameKey: `${pet.def.nameKey}.aura`,
      kind: 'damageReduction',
      magnitude,
      duration: 'wholeFight',
      tone: 'buff',
    };
  }

  return {
    id: `aura:${pet.def.id}`,
    nameKey: `${pet.def.nameKey}.aura`,
    kind: 'statScale',
    stat: aura.stat,
    magnitude,
    duration: 'wholeFight',
    tone: 'buff',
  };
}

/**
 * What the companion at the hero's side is worth to Power Level (Brief §13).
 *
 * A companion has its own health bar and takes its own turn, so none of it is
 * visible through the hero's stats — and a player fielding a maxed Cinder Hound
 * would otherwise draw drops sized for someone fighting alone.
 */
export function petPower(pet: OwnedPet | null): number {
  return pet === null ? 0 : pet.level * POWER_PER_PET_LEVEL;
}

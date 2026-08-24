/**
 * The companion roster (Q42).
 *
 * Six species, each freed by a floor deep enough that finding one is an event —
 * the whole roster spans floor 5 to floor 260, which is most of a long player's
 * first serious climb. They are content (Brief §2.3): a seventh is a record in
 * this file plus its strings and its art, with no change to game logic.
 *
 * Each species is described by three things and nothing else:
 *
 *  - **What share of the hero it fights with**, per stat. A companion has no
 *    gear and no bracket; it is a fraction of whoever it walks beside, which is
 *    what keeps one relevant at floor 40 and at floor 4000 alike.
 *  - **How much of the enemy's attention it draws.** A guardian is worth
 *    fielding because of what it *stops*, not what it deals.
 *  - **The aura it gives the hero at the bell.** This is the reason to switch
 *    rather than to field the strongest: the numbers are close, the stats differ.
 *
 * Speed appears in the ratios and is not a violation of §6: a companion's Speed
 * is the companion's, derived from the gear the hero is already wearing. Nothing
 * here adds a point of Speed to the hero, and the aura type cannot express one.
 */
import type { UpgradableStatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

/** What a companion does for the hero while it is alive. */
export type PetAura =
  /** Raises one of the hero's stats. Never Speed — gear is its only source (§6). */
  | { kind: 'statScale'; stat: UpgradableStatId }
  /** Turns aside a share of every blow that reaches the hero. */
  | { kind: 'damageReduction' };

/** Share of each of the hero's stats a companion fights with. */
export interface PetRatios {
  strength: number;
  defense: number;
  hp: number;
  luck: number;
  speed: number;
}

export interface PetDef {
  id: string;
  nameKey: StringKey;
  descriptionKey: StringKey;
  /** Painted art id, registered in the vendored stylesheet. */
  avatar: string;
  /** First floor whose clearing frees this species for the whole account. */
  unlockFloor: number;
  ratios: PetRatios;
  /** Share of the enemy's attacks it pulls onto itself. */
  taunt: number;
  aura: PetAura;
}

export const PETS: readonly PetDef[] = [
  {
    id: 'pet.emberling',
    nameKey: 'pet.emberling',
    descriptionKey: 'pet.emberling.desc',
    avatar: 'fire-flame-drop',
    unlockFloor: 5,
    // The first one anybody meets, and deliberately the simplest: it hits things.
    ratios: { strength: 0.55, defense: 0.3, hp: 0.4, luck: 0.4, speed: 0.35 },
    taunt: 0.14,
    aura: { kind: 'statScale', stat: 'strength' },
  },
  {
    id: 'pet.stoneWhelp',
    nameKey: 'pet.stoneWhelp',
    descriptionKey: 'pet.stoneWhelp.desc',
    avatar: 'hunt-jade-carapace',
    unlockFloor: 20,
    // A wall with legs. Half the enemy's attention, and enough health to keep it.
    ratios: { strength: 0.26, defense: 0.85, hp: 0.95, luck: 0.2, speed: 0.1 },
    taunt: 0.5,
    aura: { kind: 'statScale', stat: 'defense' },
  },
  {
    id: 'pet.spireOwl',
    nameKey: 'pet.spireOwl',
    descriptionKey: 'pet.spireOwl.desc',
    avatar: 'hunt-bird-flight',
    unlockFloor: 45,
    // Fast, fragile, and almost never hit — it is not in the way, it is above it.
    ratios: { strength: 0.38, defense: 0.18, hp: 0.24, luck: 0.9, speed: 0.85 },
    taunt: 0.05,
    aura: { kind: 'statScale', stat: 'luck' },
  },
  {
    id: 'pet.graveMoth',
    nameKey: 'pet.graveMoth',
    descriptionKey: 'pet.graveMoth.desc',
    avatar: 'hunt-night-flock',
    unlockFloor: 90,
    // The only one whose aura is not a stat: what it gives is the blow that
    // lands a little softer, every single time.
    ratios: { strength: 0.33, defense: 0.5, hp: 0.55, luck: 0.45, speed: 0.4 },
    taunt: 0.26,
    aura: { kind: 'damageReduction' },
  },
  {
    id: 'pet.cinderHound',
    nameKey: 'pet.cinderHound',
    descriptionKey: 'pet.cinderHound.desc',
    avatar: 'fire-hellhound',
    unlockFloor: 160,
    // The Emberling's answer at depth: more of everything it was, and enough
    // presence that the enemy has to think about it.
    ratios: { strength: 0.8, defense: 0.36, hp: 0.5, luck: 0.5, speed: 0.5 },
    taunt: 0.22,
    aura: { kind: 'statScale', stat: 'strength' },
  },
  {
    id: 'pet.lanternWisp',
    nameKey: 'pet.lanternWisp',
    descriptionKey: 'pet.lanternWisp.desc',
    avatar: 'rune-radiance',
    unlockFloor: 260,
    // Barely there in a brawl, and the reason a signature lands two rounds
    // earlier than it otherwise would.
    ratios: { strength: 0.3, defense: 0.3, hp: 0.35, luck: 0.6, speed: 0.55 },
    taunt: 0.08,
    aura: { kind: 'statScale', stat: 'resource' },
  },
];

const BY_ID = new Map(PETS.map((def) => [def.id, def]));

export function getPet(id: string): PetDef | undefined {
  return BY_ID.get(id);
}

/** Every species a floor this deep has freed, shallowest first. */
export function petsUnlockedBy(floor: number): readonly PetDef[] {
  return PETS.filter((def) => def.unlockFloor <= floor);
}

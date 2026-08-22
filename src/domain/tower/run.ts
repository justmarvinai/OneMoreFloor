/**
 * The tower run (Brief §3.3, §3.4; Q8, Q23).
 *
 * This is the loop the whole game exists to serve. Three rules from the brief
 * are enforced here rather than trusted to callers:
 *
 *  - **Death destroys nothing owned** (§3.3). A death resets `currentRunFloor`
 *    and nothing else: level, XP, ascension, gear, materials, currencies and the
 *    highest-floor record all survive. The type below returns a whole character,
 *    so there is no path where a caller forgets which fields to keep.
 *  - **The highest floor ever cleared is permanent** (§3.4).
 *  - **Skipping changes nothing but the animation** (§3.4, Q8). Quick-Raid calls
 *    exactly the same resolution and the same reward roll; the only difference
 *    is that nobody watches.
 */
import { createRng } from '@/app/rng.ts';
import { getClass } from '@/content/classes/index.ts';
import { signatureFor } from '../combat/signature.ts';
import { resolveCombat } from '../combat/resolve.ts';
import type { CombatScript, Combatant } from '../combat/types.ts';
import { combatStatsOf, equippedItems, totalStatsOf } from '../character/character.ts';
import type { Character } from '../character/types.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { bracketFor } from '../power/brackets.ts';
import { powerLevel } from '../power/power.ts';
import { enemyCombatant, generateFloor, type GeneratedFloor } from './floors.ts';
import { awardXp } from '../progression/xp.ts';
import { emptyReward, mergeRewards, rollFloorReward, type FloorReward } from './rewards.ts';

export interface FloorResult {
  floor: number;
  isBoss: boolean;
  generated: GeneratedFloor;
  script: CombatScript;
  cleared: boolean;
  /** Null when the hero lost: no reward for a floor you did not clear. */
  reward: FloorReward | null;
  /** The character after the fight — rewards applied, or the run reset. */
  character: Character;
  /** Levels gained from the floor's experience, for the UI to celebrate. */
  levelsGained: number;
}

/**
 * Build the hero's combatant from their current stats, gear and running potions.
 *
 * `now` comes from the clock service, because potions expire in real time (Q9).
 * Passing it explicitly is what keeps a fight replayable: the same save and the
 * same instant always produce the same combatant.
 */
export function heroCombatant(character: Character, now: number): Combatant {
  const definition = getClass(character.identity.classId);
  const stats = combatStatsOf(character, now);

  // The Warrior's signature depends on whether a shield is in hand (Q26).
  const offhand = character.equipment.offhand;
  const hasShield = offhand !== undefined && requireItemDef(offhand.defId).weaponKind === 'shield';

  return {
    id: 'hero',
    nameKey: definition.nameKey,
    sourceId: character.identity.classId,
    avatar: definition.art.portrait,
    baseStats: stats,
    hp: stats.hp,
    maxHp: stats.hp,
    resource: {
      kind: definition.resource.kind,
      current: 0,
      pool: stats.resource,
    },
    signature: signatureFor(character.identity.classId, hasShield),
    effects: [],
  };
}

export function bracketForCharacter(character: Character) {
  return bracketFor(
    powerLevel({
      equipped: equippedItems(character),
      stats: totalStatsOf(character),
      ascension: character.progression.ascension,
      highestFloorEverCleared: character.tower.highestFloorEverCleared,
    }),
  );
}

/**
 * Fight one floor and apply the consequences.
 *
 * Rewards are rolled during resolution from the same seed, so a skipped fight
 * and a watched one produce identical loot (Q8) — the property test asserts it.
 */
export function fightFloor(character: Character, floor: number, now: number): FloorResult {
  const generated = generateFloor(character.tower.runSeed, floor);
  const seed = `${character.tower.runSeed}/combat:${floor}`;

  const script = resolveCombat({
    hero: heroCombatant(character, now),
    enemy: enemyCombatant(generated),
    floor,
    isBoss: generated.isBoss,
    floorEffects: generated.effects,
    seed,
  });

  if (!script.outcome.heroSurvived) {
    return {
      floor,
      isBoss: generated.isBoss,
      generated,
      script,
      cleared: false,
      reward: null,
      character: applyDeath(character),
      levelsGained: 0,
    };
  }

  const reward = rollFloorReward({
    floor,
    isBoss: generated.isBoss,
    bracket: bracketForCharacter(character),
    classId: character.identity.classId,
    ascension: character.progression.ascension,
    rng: createRng(`${seed}/reward`),
  });

  const cleared = applyClear(character, floor, reward);
  return {
    floor,
    isBoss: generated.isBoss,
    generated,
    script,
    cleared: true,
    reward,
    character: cleared.character,
    levelsGained: cleared.levelsGained,
  };
}

export interface ClearResult {
  character: Character;
  levelsGained: number;
}

/**
 * Apply a cleared floor: rewards banked, levels awarded, the run advanced, and
 * the permanent record updated if this is the deepest the hero has ever been
 * (§3.4).
 *
 * Experience is converted into levels **here**, not left banked for a caller to
 * remember: leaving it raw invites exactly the double-counting bug the balance
 * simulator caught the first time it ran.
 */
export function applyClear(character: Character, floor: number, reward: FloorReward): ClearResult {
  const materials = { ...character.materials };
  for (const [id, count] of Object.entries(reward.materials)) {
    materials[id] = (materials[id] ?? 0) + count;
  }

  const withLoot: Character = {
    ...character,
    currencies: {
      gold: character.currencies.gold + reward.gold,
      tickets: character.currencies.tickets + reward.tickets,
      luckyTickets: character.currencies.luckyTickets + reward.luckyTickets,
    },
    materials,
    inventory: [...character.inventory, ...reward.items],
    tower: {
      ...character.tower,
      currentRunFloor: floor + 1,
      highestFloorEverCleared: Math.max(character.tower.highestFloorEverCleared, floor),
    },
  };

  const levelled = awardXp(withLoot, reward.xp);
  return { character: levelled.character, levelsGained: levelled.levelsGained };
}

/**
 * Death (Brief §3.3).
 *
 * The tower resets to floor 1. **Everything else is untouched** — that is the
 * whole rule, and writing it as a single spread over `tower` is what makes it
 * impossible to get wrong by accident.
 *
 * The run seed advances, so the next climb is a *new* tower rather than a replay
 * of the one that just killed you. Floors stay stable within a run, which is what
 * the stability guarantee is actually for; repeating the identical tower every
 * death would make the re-climb a memory test. The new seed is derived from the
 * old one, so the whole chain stays deterministic and replayable.
 */
export function applyDeath(character: Character): Character {
  return {
    ...character,
    tower: {
      ...character.tower,
      currentRunFloor: 1,
      runSeed: nextRunSeed(character.tower.runSeed),
    },
  };
}

/** Deterministically derive the next run's seed from this one. */
export function nextRunSeed(seed: string): string {
  return `${seed}~${createRng(`${seed}/next-run`).int(0, 0xffffff).toString(36)}`;
}

/** A floor can be skipped only if it has been cleared before (Brief §3.4). */
export function canQuickRaid(character: Character, floor: number): boolean {
  return floor <= character.tower.highestFloorEverCleared;
}

export interface QuickRaidResult {
  /** Floors fought, in order. */
  floors: FloorResult[];
  /** Everything won, folded together for one summary (Q8). */
  reward: FloorReward;
  character: Character;
  /** True when the raid stopped early because the hero died. */
  died: boolean;
  /** The last floor actually cleared. */
  reachedFloor: number;
  /** Levels gained across the whole raid. */
  levelsGained: number;
}

/**
 * Quick-Raid (Brief §3.4, Q8).
 *
 * Skips from the current floor up to `throughFloor`, resolving each fight for
 * real and stopping the moment the hero would die — a skip is a fast-forward,
 * never a guarantee. Only floors already cleared may be raided, so the first
 * unbeaten floor always has to be fought properly.
 */
export function quickRaid(
  character: Character,
  throughFloor: number,
  now: number,
): QuickRaidResult {
  const floors: FloorResult[] = [];
  let current = character;
  let reward = emptyReward();
  let died = false;
  let levelsGained = 0;
  let reached = current.tower.currentRunFloor - 1;

  for (let floor = current.tower.currentRunFloor; floor <= throughFloor; floor += 1) {
    if (!canQuickRaid(current, floor)) break;

    const result = fightFloor(current, floor, now);
    floors.push(result);
    current = result.character;

    if (!result.cleared) {
      died = true;
      break;
    }

    reward = mergeRewards(reward, result.reward!);
    levelsGained += result.levelsGained;
    reached = floor;
  }

  return { floors, reward, character: current, died, reachedFloor: reached, levelsGained };
}

/** The deepest floor this character could raid to right now (§3.4). */
export function quickRaidCeiling(character: Character): number {
  return character.tower.highestFloorEverCleared;
}

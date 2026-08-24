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
import { resolveCombat, type ResolvePet } from '../combat/resolve.ts';
import type { CombatScript, Combatant } from '../combat/types.ts';
import { combatStatsOf, equippedItems, powerInputsFor } from '../character/character.ts';
import type { Character } from '../character/types.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { bracketFor } from '../power/brackets.ts';
import { wornPowers } from '../items/sets.ts';
import { NO_ECHOES, type EchoBonuses } from '../account/echoes.ts';
import { powerLevel } from '../power/power.ts';
import { enemyCombatant, generateFloor, type GeneratedFloor } from './floors.ts';
import { grantReward } from '../rewards/grant.ts';
import { talentBonuses } from '../talents/talents.ts';
import { pathFor, pathSpoils } from './paths.ts';
import type { StatBlock } from '../stats.ts';
import { auraEffect, petStats, petTaunt, type OwnedPet } from '../pets/pets.ts';
import { emptyReward, mergeRewards, rollFloorReward, type FloorReward } from './rewards.ts';
import { milestoneUnclaimed, rollMilestoneReward } from './milestones.ts';

export interface FloorResult {
  floor: number;
  isBoss: boolean;
  generated: GeneratedFloor;
  script: CombatScript;
  cleared: boolean;
  /** Null when the hero lost: no reward for a floor you did not clear. */
  reward: FloorReward | null;
  /** A milestone chest, when this was the first ever clear of a milestone floor. */
  milestone: FloorReward | null;
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

  const talents = talentBonuses(character);

  return {
    id: 'hero',
    // Rules carried by named uniques the hero is wearing (Q45). Collected here
    // rather than read from the character inside the engine, because the engine
    // must never know what a character is.
    powers: wornPowers(equippedItems(character)),
    // The four levers a talent tree pulls inside a fight (Q38), for the same
    // reason and by the same route. Stats are already in `stats` above them.
    talents: {
      signature: talents.signature,
      resourceFill: talents.resourceFill,
      critDamage: talents.critDamage,
      damageReduction: talents.damageReduction,
      regeneration: talents.regeneration,
    },
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

/**
 * The companion, as a unit the engine can fight with (Q42).
 *
 * Its stats are read off the hero's *combat* stats — gear, sets, talents and
 * whatever draughts are running — so a pet is always a fraction of whoever it
 * walks beside rather than a thing that needs its own gear, its own bracket and
 * its own obsolescence. It carries no resource pool: signatures are the hero's
 * tempo dial (Q26), and a second bar ticking beside it would make the fight
 * harder to read without adding a decision.
 */
export function petCombatant(
  character: Character,
  pet: OwnedPet,
  now: number,
  /** The hero's combat stats, when the caller has already computed them. */
  heroStats?: StatBlock,
): ResolvePet {
  const stats = petStats(heroStats ?? combatStatsOf(character, now), pet);

  return {
    unit: {
      id: 'pet',
      nameKey: pet.def.nameKey,
      sourceId: pet.def.id,
      avatar: pet.def.avatar,
      baseStats: stats,
      hp: stats.hp,
      maxHp: stats.hp,
      resource: { kind: 'mana', current: 0, pool: 0 },
      signature: null,
      effects: [],
    },
    aura: auraEffect(pet),
    taunt: petTaunt(pet),
  };
}

/**
 * The bracket this character draws items from — the only path any source takes.
 *
 * The companion is an argument rather than a lookup, because it belongs to the
 * account and this function is handed a character. Everywhere the account is in
 * reach, pass it: a hero fielding a fully-grown Cinder Hound is stronger than
 * one fighting alone, and §13's whole job is to keep the tower's generosity
 * matched to what a player can actually field.
 */
export function bracketForCharacter(character: Character, pet: OwnedPet | null = null) {
  return bracketFor(powerLevel(powerInputsFor(character, pet)));
}

/**
 * Fight one floor and apply the consequences.
 *
 * Rewards are rolled during resolution from the same seed, so a skipped fight
 * and a watched one produce identical loot (Q8) — the property test asserts it.
 */
/**
 * What the *account* brings to a fight the character cannot know about itself.
 *
 * One bag rather than a growing tail of optional positional arguments: both of
 * these are account-scoped (Q36, Q42), the character has no way to reach them,
 * and a fifth `undefined` in a call would be the point where nobody could read
 * the call site any more.
 */
export interface FightAids {
  echoes?: EchoBonuses;
  /** The companion the hero has out, if any. */
  pet?: OwnedPet | null;
}

export function fightFloor(
  character: Character,
  floor: number,
  now: number,
  aids: FightAids = {},
): FloorResult {
  // The road chosen for this leg (Q41), read from the run rather than passed in:
  // it is the run's own decision, so nothing outside can forget to apply it.
  const road = pathFor(character, floor);
  const generated = generateFloor(character.tower.runSeed, floor, character.curses, road);
  const seed = `${character.tower.runSeed}/combat:${floor}`;
  const echoes = aids.echoes ?? NO_ECHOES;
  const companion = aids.pet ?? null;

  const script = resolveCombat({
    hero: heroCombatant(character, now),
    ...(companion ? { pet: petCombatant(character, companion, now) } : {}),
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
      milestone: null,
      character: applyDeath(character, { floor, killedBy: generated.enemy.id, now }),
      levelsGained: 0,
    };
  }

  const reward = rollFloorReward({
    floor,
    isBoss: generated.isBoss,
    bracket: bracketForCharacter(character, companion),
    classId: character.identity.classId,
    ascension: character.progression.ascension,
    curses: character.curses,
    isElite: generated.isElite,
    echoes,
    // Read from the hero here rather than passed in by the caller: the tree is
    // the character's own, so nothing outside can forget to apply it (Q38).
    talents: talentBonuses(character),
    path: pathSpoils(road),
    rng: createRng(`${seed}/reward`),
  });

  const cleared = applyClear(character, floor, reward, now);
  return {
    floor,
    isBoss: generated.isBoss,
    generated,
    script,
    cleared: true,
    reward,
    milestone: cleared.milestone,
    character: cleared.character,
    levelsGained: cleared.levelsGained,
  };
}

export interface ClearResult {
  character: Character;
  levelsGained: number;
  /** The milestone chest this clear paid, if it paid one. */
  milestone: FloorReward | null;
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
export function applyClear(
  character: Character,
  floor: number,
  reward: FloorReward,
  now: number,
): ClearResult {
  /**
   * A milestone chest, if this is the first time this hero has ever stood here.
   *
   * Rolled before the clear is applied, because `milestoneUnclaimed` asks about
   * the record as it was — once the floor is banked it is claimed, and the
   * chest would never pay.
   */
  const earned = milestoneUnclaimed(character, floor);
  const milestone = earned
    ? rollMilestoneReward({
        floor,
        bracket: bracketForCharacter(character),
        rng: createRng(`${character.tower.runSeed}/milestone:${floor}`),
      })
    : null;

  const climbed: Character = {
    ...character,
    tower: {
      ...character.tower,
      currentRunFloor: floor + 1,
      highestFloorEverCleared: Math.max(character.tower.highestFloorEverCleared, floor),
      ...(earned ? { milestonesClaimed: [...character.tower.milestonesClaimed, floor] } : {}),
      // What the run has banked so far, for the record it becomes when it ends.
      runGold: character.tower.runGold + reward.gold + (milestone?.gold ?? 0),
      runFights: character.tower.runFights + 1,
    },
  };

  // Every reward in the game is banked by the same function, so a quest payout
  // and a floor payout can never drift apart in what they actually give.
  const banked = grantReward(climbed, reward);
  const withChest = milestone ? grantReward(banked.character, milestone) : banked;

  void now;
  return {
    character: withChest.character,
    levelsGained: banked.levelsGained + (milestone ? withChest.levelsGained : 0),
    milestone,
  };
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
export interface DeathContext {
  /** The floor the fatal fight was on. */
  floor: number;
  /** Enemy id that ended it. */
  killedBy: string;
  now: number;
}

/**
 * How many finished runs are kept.
 *
 * A history list is for seeing whether you are getting further, and twenty runs
 * is more than enough to see that. An unbounded list is a save that grows
 * forever for a screen nobody scrolls to the bottom of.
 */
export const RUN_HISTORY_LIMIT = 20;

export function applyDeath(character: Character, context?: DeathContext): Character {
  /**
   * The run becomes a record.
   *
   * Written on death rather than accumulated live, so a crash mid-run costs a
   * line in a list rather than corrupting the one being written. Newest first,
   * capped: the list exists to show a trend, and a trend needs twenty runs, not
   * four hundred.
   */
  const history = context
    ? [
        {
          floor: Math.max(0, context.floor - 1),
          diedOn: context.floor,
          endedAt: context.now,
          killedBy: context.killedBy,
          gold: character.tower.runGold,
          fights: character.tower.runFights + 1,
        },
        ...character.tower.history,
      ].slice(0, RUN_HISTORY_LIMIT)
    : character.tower.history;

  return {
    ...character,
    tower: {
      ...character.tower,
      currentRunFloor: 1,
      runSeed: nextRunSeed(character.tower.runSeed),
      // The roads walked belonged to the run, and the run is over. A new climb
      // forks again from its own seed (Q41).
      pathChoices: {},
      history,
      runGold: 0,
      runFights: 0,
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
  aids: FightAids = {},
): QuickRaidResult {
  const floors: FloorResult[] = [];
  let current = character;
  let reward = emptyReward();
  let died = false;
  let levelsGained = 0;
  let reached = current.tower.currentRunFloor - 1;

  for (let floor = current.tower.currentRunFloor; floor <= throughFloor; floor += 1) {
    if (!canQuickRaid(current, floor)) break;

    const result = fightFloor(current, floor, now, aids);
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

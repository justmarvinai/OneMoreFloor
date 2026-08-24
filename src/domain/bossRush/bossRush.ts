/**
 * The Boss Rush (Q39) — ten gates, one health bar.
 *
 * The tower hands the hero a full bar at every floor. The rush does not: it runs
 * the ten authored bosses back to back on whatever is left of you, which turns a
 * build's *depth* into the thing being measured rather than its ceiling.
 *
 * It is deliberately outside the climb. A rush never advances the run, never
 * resets it, and losing one costs nothing — a side mode that could undo an hour
 * of climbing is a side mode nobody with an hour of climbing behind them opens.
 * What it costs is time; what it pays is a chest for every gate past the
 * account's best, which is the same "new ground only" rule the echoes run on
 * (Q36) and the reason a rush cannot be farmed.
 */
import { createRng } from '@/app/rng.ts';
import {
  BOSS_RUSH_DEPTH_SHARE,
  BOSS_RUSH_GATES,
  BOSS_RUSH_GATE_MULTIPLIER,
  BOSS_RUSH_MIN_FLOOR,
} from '@/content/balance/bossRush.ts';
import { BOSSES } from '@/content/enemies/index.ts';
import type { BossDef } from '@/content/enemies/types.ts';
import { combatStatsOf } from '../character/character.ts';
import { resolveCombat } from '../combat/resolve.ts';
import type { CombatScript } from '../combat/types.ts';
import type { Account, Character } from '../character/types.ts';
import { grantReward } from '../rewards/grant.ts';
import { bracketForCharacter, heroCombatant, petCombatant, type FightAids } from '../tower/run.ts';
import { enemyCombatant, generateGate } from '../tower/floors.ts';
import {
  emptyReward,
  mergeRewards,
  rollFloorReward,
  scaleReward,
  type FloorReward,
} from '../tower/rewards.ts';
import { NO_ECHOES } from '../account/echoes.ts';
import { talentBonuses } from '../talents/talents.ts';

export { BOSS_RUSH_GATES, BOSS_RUSH_MIN_FLOOR };

/** The bosses a rush runs, in the order the tower gives them up. */
export const RUSH_BOSSES: readonly BossDef[] = BOSSES.slice(0, BOSS_RUSH_GATES);

/**
 * The floor gate `index` (1-based) is fought at.
 *
 * Never shallower than the boss's own floor in the tower, so a hero who has only
 * just met the first gate fights the ladder they know — and past a record of a
 * hundred the ten gates spread across whatever depth they have actually earned.
 */
export function gateFloor(index: number, record: number): number {
  const canonical = index * BOSS_RUSH_GATES;
  return Math.max(canonical, Math.round(Math.max(0, record) * index * BOSS_RUSH_DEPTH_SHARE));
}

/** True once the hero has met the first gate, which is what the rush is of. */
export function canRush(character: Pick<Character, 'tower'>): boolean {
  return character.tower.highestFloorEverCleared >= BOSS_RUSH_MIN_FLOOR;
}

/** One gate, fought. */
export interface GateResult {
  /** 1-based, in the order the tower gives the bosses up. */
  index: number;
  boss: BossDef;
  floor: number;
  script: CombatScript;
  cleared: boolean;
  /** Health the hero carried out of it, for the card to show the toll. */
  heroHpRemaining: number;
}

export interface BossRushResult {
  gates: GateResult[];
  /** How many gates fell. */
  cleared: number;
  /** The account's best before this run, for "did I get further?". */
  previousBest: number;
  /** True when this run went deeper than any before it. */
  isRecord: boolean;
  /** The chest, paid for gates past the previous best only. */
  reward: FloorReward;
  /** The character after the chest is banked. The run is untouched. */
  character: Character;
  levelsGained: number;
}

export interface BossRushInput {
  character: Character;
  /** The account's best so far, which decides what this run is paid for. */
  best: number;
  now: number;
  aids?: FightAids;
}

/**
 * Run the whole rush and apply its chest.
 *
 * Resolved in one pass, like a Quick-Raid, because ten watched boss fights is
 * not a thing anyone sits through — and because the outcome was never a product
 * of the animation (Q8). The screen performs the summary.
 */
export function runBossRush(input: BossRushInput): BossRushResult {
  const { character, best, now } = input;
  const aids = input.aids ?? {};
  const record = character.tower.highestFloorEverCleared;
  const seed = `${character.tower.runSeed}/rush:${record}`;

  const hero = heroCombatant(character, now);
  const stats = combatStatsOf(character, now);
  const companion = aids.pet ?? null;
  const petBase = companion ? petCombatant(character, companion, now, stats) : null;

  const gates: GateResult[] = [];
  let heroHp = hero.hp;
  let heroResource = 0;
  let petHp = petBase?.unit.hp ?? 0;
  let cleared = 0;

  for (let index = 1; index <= RUSH_BOSSES.length; index += 1) {
    const boss = RUSH_BOSSES[index - 1]!;
    const floor = gateFloor(index, record);
    const generated = generateGate(boss, floor, character.curses);

    const script = resolveCombat({
      // Wounds carry, and so does the bar: a rush is one long fight with ten
      // opponents in it, not ten fights that happen to be adjacent.
      hero: { ...hero, hp: heroHp, resource: { ...hero.resource, current: heroResource } },
      // A companion that has already gone down stays down. That is the cost of
      // fielding a striker where a guardian would have held (Q42).
      ...(petBase && petHp > 0
        ? { pet: { ...petBase, unit: { ...petBase.unit, hp: petHp } } }
        : {}),
      enemy: enemyCombatant(generated),
      floor,
      isBoss: true,
      floorEffects: generated.effects,
      seed: `${seed}/gate:${index}`,
    });

    const survived = script.outcome.heroSurvived;
    gates.push({
      index,
      boss,
      floor,
      script,
      cleared: survived,
      heroHpRemaining: script.outcome.heroHpRemaining,
    });

    if (!survived) break;

    cleared = index;
    heroHp = script.outcome.heroHpRemaining;
    heroResource = 0;
    petHp = script.outcome.petHpRemaining ?? 0;
  }

  const reward = rushReward({ character, aids, cleared, best, record, seed });
  const granted = grantReward(character, reward);

  return {
    gates,
    cleared,
    previousBest: best,
    isRecord: cleared > best,
    reward,
    character: granted.character,
    levelsGained: granted.levelsGained,
  };
}

/**
 * The chest, for the gates this run reached past the account's best.
 *
 * A run that ties the record pays nothing, which is what keeps the rush from
 * being a farm: the only thing it can be spent on is getting further.
 */
function rushReward(input: {
  character: Character;
  aids: FightAids;
  cleared: number;
  best: number;
  record: number;
  seed: string;
}): FloorReward {
  const { character, aids, cleared, best, record, seed } = input;
  if (cleared <= best) return emptyReward();

  const bracket = bracketForCharacter(character, aids.pet ?? null);
  let reward = emptyReward();

  for (let index = best + 1; index <= cleared; index += 1) {
    const gate = rollFloorReward({
      floor: gateFloor(index, record),
      isBoss: true,
      bracket,
      classId: character.identity.classId,
      ascension: character.progression.ascension,
      curses: character.curses,
      echoes: aids.echoes ?? NO_ECHOES,
      talents: talentBonuses(character),
      rng: createRng(`${seed}/chest:${index}`),
    });
    reward = mergeRewards(reward, scaleReward(gate, BOSS_RUSH_GATE_MULTIPLIER));
  }

  return reward;
}

/** Bank a new best, or leave the account exactly as it was. */
export function recordBest(account: Account, cleared: number): Account {
  if (cleared <= account.bossRushBest) return account;
  return { ...account, bossRushBest: cleared };
}

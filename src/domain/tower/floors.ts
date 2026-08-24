/**
 * Floor generation (Brief §3.1/§3.7, CONTENT_PIPELINE §2).
 *
 * The tower is endless, so floors are generated rather than authored. Two
 * properties make that safe:
 *
 *  - **Stable**: a floor is derived from the run seed and its number, so
 *    re-entering floor 41 of the same run meets the same enemy. Nothing is
 *    stored per floor.
 *  - **Endless**: enemy stats come from one exponential over floor number, so
 *    floor 5000 is a real fight rather than an overflow (Brief §3.7).
 */
import { createRng } from '@/app/rng.ts';
import { evaluate } from '@/content/balance/curves.ts';
import {
  BOSS_KIT_SCALING,
  BOSS_MULTIPLIER,
  BOSS_RAMP,
  ELITE_CHANCE,
  ELITE_FROM_FLOOR,
  ELITE_MULTIPLIER,
  ENEMY_BASE,
  ENEMY_POWER,
  MODIFIER_CHANCE,
} from '@/content/balance/enemies.ts';
import {
  ENEMIES,
  ENEMY_MODIFIERS,
  bossForFloor,
  enemiesForFloor,
} from '@/content/enemies/index.ts';
import { applyModifier, type EnemyModifier } from '@/content/enemies/modifiers.ts';
import type { BossDef, EnemyDef } from '@/content/enemies/types.ts';
import { bandForFloor, isBossFloor, type FloorBand } from '@/content/floors/index.ts';
import type { Combatant, EffectDef, UnitId } from '../combat/types.ts';
import { STAT_IDS, type StatBlock, type StatId } from '../stats.ts';
import { curseStatMultiplier } from './curses.ts';
import { pathElites, pathStats, type PathDef } from './paths.ts';

export interface GeneratedFloor {
  floor: number;
  isBoss: boolean;
  /**
   * An elite: a normal floor's enemy standing a head taller (Q44). Never true
   * on a boss floor — a gate is already the thing an elite is a small version
   * of, and stacking them would make one floor in eleven impassable.
   */
  isElite: boolean;
  band: FloorBand;
  enemy: EnemyDef | BossDef;
  modifier: EnemyModifier | null;
  stats: StatBlock;
  /** Effects the floor imposes before the first blow (Brief §3.2). */
  effects: Array<{ unit: UnitId; effect: EffectDef }>;
}

/** Deterministic per-run, per-floor seed — the source of floor stability. */
export function floorSeed(runSeed: string, floor: number): string {
  return `${runSeed}/floor:${floor}`;
}

function statsFor(
  floor: number,
  profile: Partial<Record<StatId, number>>,
  isBoss: boolean,
): StatBlock {
  const power = evaluate({ kind: 'exponential', ...ENEMY_POWER }, floor);

  const ramp = bossRamp(floor);
  const scaled = (stat: StatId): number => {
    const base = ENEMY_BASE[stat as keyof typeof ENEMY_BASE] ?? 1;
    // Only the *excess* over a normal floor ramps, so a boss is never weaker
    // than the floor below it however early the gate is.
    const full = BOSS_MULTIPLIER[stat as keyof typeof BOSS_MULTIPLIER];
    const bossScale = isBoss ? 1 + (full - 1) * ramp : 1;
    return Math.max(1, Math.round(base * power * (profile[stat] ?? 1) * bossScale));
  };

  return {
    strength: scaled('strength'),
    defense: scaled('defense'),
    hp: scaled('hp'),
    resource: scaled('resource'),
    luck: scaled('luck'),
    speed: scaled('speed'),
  };
}

/**
 * How much of a boss's excess over a normal floor applies at this depth: the
 * first gate teaches, the deep ones are walls (BALANCE.md §9f).
 */
export function bossRamp(floor: number): number {
  const { fromFloor, toFloor, start } = BOSS_RAMP;
  if (floor <= fromFloor) return start;
  if (floor >= toFloor) return 1;
  return start + (1 - start) * ((floor - fromFloor) / (toFloor - fromFloor));
}

/**
 * Scale a boss's kit with depth, so deep bosses bite harder (§3.2) — and *ramp
 * it in* alongside the stat excess, so the first gate's debuff is a taste of the
 * mechanic rather than the reason a new player cannot pass floor 10.
 */
function scaleEffect(effect: EffectDef, floor: number): EffectDef {
  const scale = evaluate({ kind: 'exponential', ...BOSS_KIT_SCALING }, floor) * bossRamp(floor);
  return { ...effect, magnitude: effect.magnitude * scale };
}

/**
 * Generate a floor. Pure and seeded: the same run seed and floor always give
 * the same fight.
 */
export function generateFloor(
  runSeed: string,
  floor: number,
  curses: readonly string[] = [],
  /** The road this leg is being walked on, if one has been chosen (Q41). */
  path: PathDef | null = null,
): GeneratedFloor {
  const rng = createRng(floorSeed(runSeed, floor));
  const boss = isBossFloor(floor);
  const band = bandForFloor(floor);

  const enemy: EnemyDef | BossDef = boss ? bossForFloor(floor) : enemyFor(runSeed, floor, band);

  /**
   * Elite, drawn from the floor's own stream so the preview, the trail mark and
   * the fight all agree without anything being stored (Q44).
   *
   * Rolled before the modifier, and deliberately *widening* it: an elite carries
   * a modifier even inside the authored range, which is what makes a Frenzied
   * Cutpurse a fight floor 12 can produce and never has before.
   */
  // The Gauntlet turns a leg into a run of champions. Rolled from the floor's
  // own stream either way, so the preview, the trail mark and the fight agree.
  const eliteChance = Math.min(1, ELITE_CHANCE + pathElites(path));
  const elite = !boss && floor >= ELITE_FROM_FLOOR && rng.chance(eliteChance);

  // Past the authored floors an enemy may carry a modifier, which trades one
  // stat for another rather than simply inflating it (CONTENT_PIPELINE §2).
  const canModify = !boss && (elite || floor > enemy.floors[1]);
  const modifier =
    canModify && (elite || rng.chance(MODIFIER_CHANCE)) ? rng.pick(ENEMY_MODIFIERS) : null;

  const profile = modifier ? applyModifier(enemy.profile, modifier) : enemy.profile;
  // Curses are applied to the *finished* stats rather than to the profile, so a
  // cursed floor is the same floor with harder numbers — same enemy, same
  // modifier, same seed — which is what keeps a run replayable (Q35).
  // Route, then elite, then curses — all applied to the *finished* stats, so a
  // hard leg is the same floor with harder numbers rather than a different roll.
  const stats = curseStats(
    pathStats(eliteStats(statsFor(floor, profile, boss), elite), path),
    curses,
  );

  const effects: Array<{ unit: UnitId; effect: EffectDef }> = [];
  if (enemy.playerDebuff) {
    effects.push({
      unit: 'hero',
      effect: boss ? scaleEffect(enemy.playerDebuff, floor) : enemy.playerDebuff,
    });
  }
  const selfBuff = (enemy as Partial<BossDef>).selfBuff;
  if (boss && selfBuff) {
    effects.push({ unit: 'enemy', effect: scaleEffect(selfBuff, floor) });
  }

  return { floor, isBoss: boss, isElite: elite, band, enemy, modifier, stats, effects };
}

/**
 * One gate of the boss rush: a named boss, fought at a chosen depth (Q39).
 *
 * The rush does not walk the tower, so it cannot ask a *floor* which boss lives
 * there — it names the boss and picks the depth. Everything else is the ordinary
 * boss floor: the same stat curve, the same scaled debuff and self-buff, the
 * same curse arithmetic. A gate that were built any other way would drift away
 * from the boss the player fights on the way up, which is the one thing the rush
 * is measuring them against.
 */
export function generateGate(
  boss: BossDef,
  floor: number,
  curses: readonly string[] = [],
): GeneratedFloor {
  return {
    floor,
    isBoss: true,
    isElite: false,
    band: bandForFloor(floor),
    enemy: boss,
    modifier: null,
    stats: curseStats(statsFor(floor, boss.profile, true), curses),
    effects: bossEffects(boss, floor),
  };
}

/** The debuff a boss lands and the buff it gives itself, both scaled to depth. */
function bossEffects(boss: BossDef, floor: number): Array<{ unit: UnitId; effect: EffectDef }> {
  const effects: Array<{ unit: UnitId; effect: EffectDef }> = [];
  if (boss.playerDebuff) {
    effects.push({ unit: 'hero', effect: scaleEffect(boss.playerDebuff, floor) });
  }
  if (boss.selfBuff) effects.push({ unit: 'enemy', effect: scaleEffect(boss.selfBuff, floor) });
  return effects;
}

/** An elite is the same enemy, larger. Applied per stat so the shape survives. */
function eliteStats(stats: StatBlock, elite: boolean): StatBlock {
  if (!elite) return stats;

  const raised = { ...stats };
  for (const stat of STAT_IDS) {
    raised[stat] = Math.max(1, Math.round(raised[stat] * (ELITE_MULTIPLIER[stat] ?? 1)));
  }
  return raised;
}

/** Raise every stat the player has chosen to make harder (fifth polish round). */
function curseStats(stats: StatBlock, curses: readonly string[]): StatBlock {
  if (curses.length === 0) return stats;

  const cursed = { ...stats };
  for (const stat of STAT_IDS) {
    const multiplier = curseStatMultiplier(curses, stat);
    if (multiplier !== 1) cursed[stat] = Math.max(1, Math.round(cursed[stat] * multiplier));
  }
  return cursed;
}

/**
 * Who is standing on a normal floor.
 *
 * Two gates, and an enemy needs both: its own floor range says *when* it is a
 * fair fight, the band's family list says *where* it belongs. Filtering by only
 * the first made every stretch of the tower draw from the same roster and read
 * as a number rather than a place (CONTENT_PIPELINE §2).
 *
 * Then one rule that is pure pacing: **a floor does not serve the enemy the
 * floor below served**, whenever there is anyone else to serve. Independent
 * draws produce runs — four Cave Lurkers in a row turned up in the very first
 * pacing pass — and a run of identical floors is the single loudest way an
 * endless tower can read as unfinished (§3.7).
 *
 * Honouring that exactly needs to know what the *previous* floor actually
 * served, which is itself the result of the same rule. Rather than recurse five
 * thousand floors, the chain is rebuilt from the start of the current stretch —
 * a boss floor resets it, so the walk is at most nine steps at any depth. Still
 * pure, still stateless, still the same fight every time from the same seed.
 */
function enemyFor(runSeed: string, floor: number, band: FloorBand): EnemyDef {
  let previous: string | null = null;
  let chosen: EnemyDef | null = null;

  for (let step = stretchStart(floor); step <= floor; step += 1) {
    const stepBand = step === floor ? band : bandForFloor(step);
    chosen = pickAvoiding(runSeed, step, stepBand, previous);
    previous = chosen.id;
  }
  return chosen!;
}

/** The first floor since the last boss — where a stretch's variety starts over. */
function stretchStart(floor: number): number {
  let start = floor;
  // Bounded by the boss cadence: a boss floor is never more than a decade back.
  while (start > 1 && !isBossFloor(start - 1)) start -= 1;
  return start;
}

function pickAvoiding(
  runSeed: string,
  floor: number,
  band: FloorBand,
  previous: string | null,
): EnemyDef {
  const pool = poolFor(floor, band);
  const fresh = pool.length > 1 ? pool.filter((candidate) => candidate.id !== previous) : pool;
  return weightedPick(createRng(floorSeed(runSeed, floor)), fresh.length > 0 ? fresh : pool);
}

function poolFor(floor: number, band: FloorBand): EnemyDef[] {
  const inRange = enemiesForFloor(floor);
  const inBand = inRange.filter((candidate) => band.families.includes(candidate.family));
  if (inBand.length > 0) return inBand;
  return inRange.length > 0 ? inRange : deepestEnemies(band);
}

function weightedPick(rng: ReturnType<typeof createRng>, pool: EnemyDef[]): EnemyDef {
  return rng.weighted(pool.map((candidate) => ({ value: candidate, weight: candidate.weight })));
}

/** Fallback pool for floors past every authored range: the deepest enemies. */
function deepestEnemies(band: FloorBand): EnemyDef[] {
  const inBand = ENEMIES.filter((enemy) => band.families.includes(enemy.family));
  if (inBand.length > 0) return inBand;
  return [...ENEMIES];
}

/** Turn a generated floor into the combatant the engine fights. */
export function enemyCombatant(floor: GeneratedFloor): Combatant {
  return {
    id: 'enemy',
    nameKey: floor.enemy.nameKey,
    sourceId: floor.enemy.id,
    avatar: floor.enemy.avatar,
    baseStats: floor.stats,
    hp: floor.stats.hp,
    maxHp: floor.stats.hp,
    resource: { kind: 'mana', current: 0, pool: floor.stats.resource },
    // Bosses charge a signature of their own; ordinary enemies do not (§5).
    signature: floor.isBoss ? 'bossOnslaught' : null,
    effects: [],
  };
}

export { isBossFloor, bandForFloor };

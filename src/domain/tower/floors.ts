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
import type { StatBlock, StatId } from '../stats.ts';

export interface GeneratedFloor {
  floor: number;
  isBoss: boolean;
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

  const scaled = (stat: StatId): number => {
    const base = ENEMY_BASE[stat as keyof typeof ENEMY_BASE] ?? 1;
    const bossScale = isBoss ? BOSS_MULTIPLIER[stat as keyof typeof BOSS_MULTIPLIER] : 1;
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

/** Scale a boss's kit slowly with depth, so deep bosses bite harder (§3.2). */
function scaleEffect(effect: EffectDef, floor: number): EffectDef {
  const scale = evaluate({ kind: 'exponential', ...BOSS_KIT_SCALING }, floor);
  return { ...effect, magnitude: effect.magnitude * scale };
}

/**
 * Generate a floor. Pure and seeded: the same run seed and floor always give
 * the same fight.
 */
export function generateFloor(runSeed: string, floor: number): GeneratedFloor {
  const rng = createRng(floorSeed(runSeed, floor));
  const boss = isBossFloor(floor);
  const band = bandForFloor(floor);

  const enemy: EnemyDef | BossDef = boss ? bossForFloor(floor) : enemyFor(runSeed, floor, band);

  // Past the authored floors an enemy may carry a modifier, which trades one
  // stat for another rather than simply inflating it (CONTENT_PIPELINE §2).
  const canModify = !boss && floor > enemy.floors[1];
  const modifier = canModify && rng.chance(MODIFIER_CHANCE) ? rng.pick(ENEMY_MODIFIERS) : null;

  const profile = modifier ? applyModifier(enemy.profile, modifier) : enemy.profile;
  const stats = statsFor(floor, profile, boss);

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

  return { floor, isBoss: boss, band, enemy, modifier, stats, effects };
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

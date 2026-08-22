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
  BOSSES,
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

  let enemy: EnemyDef | BossDef;
  if (boss) {
    enemy = bossForFloor(floor) ?? BOSSES[BOSSES.length - 1]!;
  } else {
    const candidates = enemiesForFloor(floor);
    const pool = candidates.length > 0 ? candidates : deepestEnemies(band);
    enemy = rng.weighted(pool.map((candidate) => ({ value: candidate, weight: candidate.weight })));
  }

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
  if (boss && 'selfBuff' in enemy && enemy.selfBuff) {
    effects.push({ unit: 'enemy', effect: scaleEffect(enemy.selfBuff, floor) });
  }

  return { floor, isBoss: boss, band, enemy, modifier, stats, effects };
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

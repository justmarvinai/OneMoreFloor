/**
 * Branching paths (Q41) — the fork at every gate.
 *
 * A line has no decisions in it. Every ten floors the tower forks, the player
 * picks how the next ten will go, and the pick holds until the next gate. Every
 * route is a *trade* rather than an upgrade: more danger for more spoils, coin
 * for experience, or less of everything when a wall needs walking past.
 *
 * The choice belongs to the **run**, not the hero: it lives in `tower.pathChoices`
 * and dies with the run, which is what makes it a decision about *this* climb
 * rather than a setting. What is offered is drawn from the run seed, so a fork
 * is the same fork every time that run reaches it — a route the player did not
 * take is a route that was really there.
 */
import { createRng } from '@/app/rng.ts';
import { FLOORS_PER_LEG, PATHS_OFFERED } from '@/content/balance/paths.ts';
import { PATHS, PLAIN_PATH, getPath, type PathDef } from '@/content/paths/index.ts';
import type { Character } from '../character/types.ts';
import { STAT_IDS, type StatBlock } from '../stats.ts';

export { PATHS, PLAIN_PATH, getPath, FLOORS_PER_LEG };
export type { PathDef };

/** Which leg of the climb a floor belongs to. Leg 0 is floors 1–10. */
export function legOf(floor: number): number {
  return Math.floor((Math.max(1, floor) - 1) / FLOORS_PER_LEG);
}

/** The floors a leg covers, as `[from, to]`. */
export function legRange(leg: number): [number, number] {
  const from = leg * FLOORS_PER_LEG + 1;
  return [from, from + FLOORS_PER_LEG - 1];
}

/**
 * The three routes this run offers at this leg.
 *
 * Drawn from the run seed rather than rolled when the screen opens, so the fork
 * a player walks away from and comes back to is the same fork — and so a replay
 * of the run offers what the run offered. The plain way is always one of them.
 */
export function forkFor(runSeed: string, leg: number): PathDef[] {
  const rng = createRng(`${runSeed}/fork:${leg}`);
  const rest = PATHS.filter((def) => def.always !== true);
  const drawn: PathDef[] = [];
  const pool = [...rest];

  while (drawn.length < PATHS_OFFERED - 1 && pool.length > 0) {
    const index = rng.int(0, pool.length - 1);
    drawn.push(pool.splice(index, 1)[0]!);
  }

  // The plain way first: a fork reads as "or you could just climb", which is
  // what it is.
  return [PLAIN_PATH, ...drawn];
}

/** The route the run is walking on this floor, or null when none is chosen. */
export function pathFor(character: Pick<Character, 'tower'>, floor: number): PathDef | null {
  const chosen = character.tower.pathChoices[String(legOf(floor))];
  return chosen ? (getPath(chosen) ?? null) : null;
}

/** True when the floor the hero is standing on has no route yet. */
export function needsChoice(character: Pick<Character, 'tower'>, floor: number): boolean {
  return pathFor(character, floor) === null;
}

export type PathRefusal = 'noSuchPath' | 'notOffered' | 'alreadyChosen';

/**
 * Take a road.
 *
 * Refused rather than overwritten once a leg is under way: the whole weight of
 * the decision is that it holds for ten floors, and a choice that could be
 * changed after seeing the first fight is not one.
 */
export function choosePath(
  character: Character,
  floor: number,
  id: string,
): Character | PathRefusal {
  const leg = legOf(floor);
  if (character.tower.pathChoices[String(leg)] !== undefined) return 'alreadyChosen';

  const def = getPath(id);
  if (!def) return 'noSuchPath';
  if (!forkFor(character.tower.runSeed, leg).some((offered) => offered.id === def.id)) {
    return 'notOffered';
  }

  return {
    ...character,
    tower: {
      ...character.tower,
      pathChoices: { ...character.tower.pathChoices, [String(leg)]: def.id },
    },
  };
}

/**
 * Enemy stats on this route.
 *
 * Applied to the finished stats rather than to the profile, exactly as curses
 * are (Q35): a floor on the Sheer Face is the same floor with harder numbers —
 * same enemy, same modifier, same seed — which is what keeps a run replayable.
 */
export function pathStats(stats: StatBlock, path: PathDef | null): StatBlock {
  if (!path || path.danger === 1) return stats;

  const scaled = { ...stats };
  for (const stat of STAT_IDS) scaled[stat] = Math.max(1, Math.round(stats[stat] * path.danger));
  return scaled;
}

/** Added to a floor's elite chance by the route being walked (Q44). */
export function pathElites(path: PathDef | null): number {
  return path?.elites ?? 0;
}

/** What the route multiplies a floor's payout by, per currency. */
export interface PathSpoils {
  gold: number;
  xp: number;
  materials: number;
}

export const NO_PATH_SPOILS: PathSpoils = { gold: 1, xp: 1, materials: 1 };

export function pathSpoils(path: PathDef | null): PathSpoils {
  if (!path) return NO_PATH_SPOILS;
  return { gold: path.gold, xp: path.xp, materials: path.materials };
}

/** Forget every road walked. Called when a run ends, because a run chose them. */
export function clearPaths(character: Character): Character {
  return { ...character, tower: { ...character.tower, pathChoices: {} } };
}

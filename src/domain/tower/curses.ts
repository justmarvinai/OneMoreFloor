/**
 * Curses — enemy affixes the player switches on (fifth polish round).
 *
 * A curse raises a stat on **every** enemy in the tower and raises what every
 * floor pays. That is the whole trade, and it is the first thing in the game
 * that lets a player say "make this harder": everything before it either got
 * easier as they grew or stayed where it was.
 *
 * Two things it deliberately does **not** touch:
 *
 *  - **The bracket.** Gear still drops inside the character's own Power-Level
 *    bracket, so §13's anti-overshoot rule holds with a full set of curses on.
 *    Curses pay in gold, experience and materials — the things a player spends
 *    on the piece they are building — never in better loot than they have earned.
 *  - **The seed.** A cursed floor is the same floor with harder numbers, not a
 *    different roll, so a run stays replayable and the tower keeps its shape.
 */
import {
  CURSE_UNLOCK_LEVEL,
  MAX_ACTIVE_CURSES,
  curseMagnitude,
} from '@/content/balance/enemies.ts';
import { CURSES, getCurse, type CurseDef } from '@/content/enemies/curses.ts';
import type { Character } from '../character/types.ts';
import type { StatId } from '../stats.ts';

export { CURSES, CURSE_UNLOCK_LEVEL, MAX_ACTIVE_CURSES };
export type { CurseDef };

/** True once the hero is deep enough to be offered the choice. */
export function cursesUnlocked(character: Pick<Character, 'progression'>): boolean {
  return character.progression.level >= CURSE_UNLOCK_LEVEL;
}

/**
 * The curses actually in force.
 *
 * Resolved from ids and capped here rather than trusted from the save: a record
 * written by an older build, or one carrying a curse this build no longer
 * defines, must not be able to put the tower into a state the screen cannot
 * describe.
 */
export function activeCurses(character: Pick<Character, 'curses'>): CurseDef[] {
  const seen = new Set<string>();
  const active: CurseDef[] = [];
  for (const id of character.curses ?? []) {
    if (seen.has(id)) continue;
    const curse = getCurse(id);
    if (!curse) continue;
    seen.add(id);
    active.push(curse);
    if (active.length === MAX_ACTIVE_CURSES) break;
  }
  return active;
}

/** How much harder these curses make one enemy stat. 1 when none touch it. */
export function curseStatMultiplier(curses: readonly string[], stat: StatId): number {
  let multiplier = 1;
  for (const curse of resolve(curses)) {
    if (!curse.raises.includes(stat)) continue;
    multiplier *= 1 + curseMagnitude(curse.raises.length).stat;
  }
  return multiplier;
}

/** How much more a floor pays under these curses. 1 when none are on. */
export function curseRewardMultiplier(curses: readonly string[]): number {
  let multiplier = 1;
  for (const curse of resolve(curses)) {
    multiplier *= 1 + curseMagnitude(curse.raises.length).reward;
  }
  return multiplier;
}

export type CurseRefusal = 'notUnlocked' | 'tooMany' | 'noSuchCurse';

/**
 * Switch a curse on or off.
 *
 * Off is always allowed, even past the cap and even below the unlock level: a
 * player must always be able to make the tower easier again, whatever state
 * their save got into.
 */
export function toggleCurse(character: Character, id: string): Character | CurseRefusal {
  const held = character.curses ?? [];
  if (held.includes(id)) {
    return { ...character, curses: held.filter((candidate) => candidate !== id) };
  }

  if (!getCurse(id)) return 'noSuchCurse';
  if (!cursesUnlocked(character)) return 'notUnlocked';
  if (activeCurses(character).length >= MAX_ACTIVE_CURSES) return 'tooMany';

  return { ...character, curses: [...held, id] };
}

function resolve(curses: readonly string[]): CurseDef[] {
  return activeCurses({ curses: [...curses] });
}

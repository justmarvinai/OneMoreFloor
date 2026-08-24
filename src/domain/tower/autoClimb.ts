/**
 * Auto-climb (Q32).
 *
 * The owner asked for two things that pull in opposite directions: a way to keep
 * climbing without pressing the button, and for that way to be **slow**. Both
 * are honoured by putting the brake between floors rather than in the fight —
 * Battle Speed already owns how fast a fight plays (§3.5), and shortening the
 * pause would make auto-climb the fastest way to play, which is the one thing
 * it must never be.
 *
 * Two modes, and the difference is where the player is:
 *
 *  - **`watching`** climbs while the tower screen is open. Every fight is one
 *    the player sees, in full, exactly as if they had pressed the button.
 *  - **`background`** keeps climbing while they are anywhere else in the game,
 *    resolving each fight without a screen. It unlocks at hero level 500,
 *    which is deep enough that a player has already climbed thousands of floors
 *    by hand and knows precisely what they are automating.
 *
 * Both stop dead on a death: a run that ended is a decision point, not a thing
 * to walk past.
 */
import {
  AUTO_CLIMB_FLOOR_DELAY_MS,
  BACKGROUND_AUTO_CLIMB_LEVEL,
} from '@/content/balance/rewards.ts';
import type { AutoClimbMode, Character } from '../character/types.ts';

export { AUTO_CLIMB_FLOOR_DELAY_MS, BACKGROUND_AUTO_CLIMB_LEVEL };

/**
 * How long the climb waits between floors, after the account's Patience (Q36).
 *
 * The echo node shortens the wait; it can never remove it. Patience is capped
 * below one in `echoBonuses` precisely so this stays true — auto-climb must
 * never become the fastest way to play (Q32), and a node that could make it so
 * would undo the whole design in six purchases.
 */
export function autoClimbDelayMs(patience = 0): number {
  return Math.max(1000, Math.round(AUTO_CLIMB_FLOOR_DELAY_MS * (1 - Math.min(0.5, patience))));
}

/** Every mode a player can choose, in the order the control offers them. */
export const AUTO_CLIMB_MODES: readonly AutoClimbMode[] = ['off', 'watching', 'background'];

/** Whether this hero may choose a mode at all. */
export function canAutoClimb(mode: AutoClimbMode, character: Character): boolean {
  if (mode !== 'background') return true;
  return character.progression.level >= BACKGROUND_AUTO_CLIMB_LEVEL;
}

/** Why a mode is refused, for the control to say rather than go quietly dead (§20.5). */
export function autoClimbRefusal(mode: AutoClimbMode, character: Character): 'levelTooLow' | null {
  return canAutoClimb(mode, character) ? null : 'levelTooLow';
}

/**
 * The mode a save should be read back at.
 *
 * A hero who was auto-climbing in the background and then had their level
 * reduced — impossible today, but ascension exists and this file should not
 * assume otherwise — falls back to watching rather than silently keeping a mode
 * they can no longer choose.
 */
export function effectiveMode(character: Character): AutoClimbMode {
  const mode = character.tower.autoClimb;
  if (mode === 'background' && !canAutoClimb('background', character)) return 'watching';
  return mode;
}

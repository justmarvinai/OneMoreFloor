/**
 * The thing that presses the button for you (Q32).
 *
 * Auto-climb lives here rather than in the tower screen for one reason: the
 * background mode has to keep going while the player is somewhere else, and a
 * timer owned by a screen dies when the screen does (ARCHITECTURE §4). So the
 * service is installed once at boot, reads the mode off the character, and is
 * re-synced whenever the world changes.
 *
 * The two modes differ in *what a fight looks like*:
 *
 *  - **`watching`** navigates into the fight, exactly as pressing the button
 *    does. It only ticks while the tower is on screen — walking to a merchant
 *    is how a player pauses it, which is the obvious meaning of "watching".
 *  - **`background`** resolves the fight without a screen and reports it in a
 *    line of text. It ticks anywhere.
 *
 * Both stop dead on a death. A run that ended is a decision point, and walking
 * a player past it while they read a shop is the one behaviour that would make
 * this feature a liability.
 */
import { AUTO_CLIMB_FLOOR_DELAY_MS, effectiveMode } from '@/domain/tower/autoClimb.ts';
import type { AppStore } from './state.ts';

export interface AutoClimbService {
  /** Re-read the world and (re)schedule, or stop. Cheap; call it freely. */
  sync(): void;
  /** Stop until the next `sync()` — what a death and a fight in flight both do. */
  halt(): void;
  destroy(): void;
}

export interface AutoClimbOptions {
  store: AppStore;
  /** True while the tower screen is the one on display. */
  onTower: () => boolean;
  /** True while a fight is playing or a dialog is open — never interrupt either. */
  busy: () => boolean;
  /** Climb one floor, watching it. */
  climbWatched: () => void;
  /** Climb one floor without a screen, and report it. */
  climbInBackground: () => void;
}

export function createAutoClimbService(options: AutoClimbOptions): AutoClimbService {
  const { store, onTower, busy, climbWatched, climbInBackground } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const sync = (): void => {
    clear();
    const character = store.get().activeCharacter;
    if (!character || busy()) return;

    const mode = effectiveMode(character);
    if (mode === 'off') return;
    if (mode === 'watching' && !onTower()) return;

    timer = setTimeout(() => {
      timer = null;
      // The world can have moved on during the wait — the player may have
      // switched it off, walked away, or died. Ask again rather than trusting
      // the decision made twenty seconds ago.
      const current = store.get().activeCharacter;
      if (!current || busy()) return;
      const now = effectiveMode(current);
      if (now === 'off') return;
      if (now === 'watching' && !onTower()) return;
      if (now === 'background') climbInBackground();
      else climbWatched();
    }, AUTO_CLIMB_FLOOR_DELAY_MS);
  };

  return {
    sync,
    halt: clear,
    destroy: clear,
  };
}

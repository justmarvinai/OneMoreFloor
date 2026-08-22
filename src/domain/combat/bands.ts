/**
 * Depth-relative reference values (BALANCE.md §4).
 *
 * Crit chance, double-attack chance and defence mitigation are all *band
 * relative*: the raw stat inflates forever as the tower goes up, and these
 * references inflate with it, so the percentages stay inside their tuned window
 * at floor 10 and floor 5000 alike. Without that, every percentage in the game
 * pins at its cap a few hundred floors in.
 */
import { evaluate } from '@/content/balance/curves.ts';
import { CRIT, DEFENSE_K, SPEED } from '@/content/balance/combat.ts';

export interface Band {
  /** Defence value that halves incoming damage at this depth. */
  defenseK: number;
  /** Luck that yields half the crit cap at this depth. */
  critReference: number;
  /** Speed that yields half the double-attack cap at this depth. */
  speedReference: number;
}

export function bandOf(floor: number): Band {
  return {
    defenseK: evaluate({ kind: 'exponential', ...DEFENSE_K }, floor),
    critReference: evaluate({ kind: 'exponential', ...CRIT.reference }, floor),
    speedReference: evaluate({ kind: 'exponential', ...SPEED.reference }, floor),
  };
}

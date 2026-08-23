/**
 * Small formatters shared by the screens.
 *
 * These exist here rather than in `strings/` because they *choose* a string
 * shape from a number — "4m" or "2h 10m" — which is a rendering decision, not a
 * translation. What they produce still goes through `t()` wherever it is
 * wrapped in a sentence.
 */

/**
 * A running potion's remaining time, at the resolution a player acts on.
 *
 * Rounded to whole minutes: draughts last tens of minutes (Brief §12), and a
 * seconds readout on a timer nobody watches second by second is just a number
 * that changes for no reason.
 */
export function shortDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/**
 * Branching paths (Q41) — the fork at every gate.
 *
 * The tower's shape is a line, and a line has no decisions in it. A fork does:
 * every ten floors the player picks how the next ten will go, and the pick is a
 * *trade* rather than an upgrade — more danger for more spoils, or less of both
 * when a wall needs walking past.
 *
 * Two rules the numbers here are bound by, both inherited from the curses that
 * came before them (Q35):
 *
 *  - **A route never touches the bracket.** Gear still drops inside the
 *    character's own Power-Level window, so §13 holds whatever route is walked.
 *    Routes pay in gold, experience and materials — the things a player spends
 *    on the piece they are building.
 *  - **A route never touches the seed.** A floor on the Sheer Face is the same
 *    floor with harder numbers, not a different roll, so a run stays replayable
 *    and the tower keeps its shape.
 */

/**
 * Floors in one leg of the climb.
 *
 * The tower's own cadence: a gate every ten floors (Brief §3.1), so a fork sits
 * exactly where the player already stops to look up. Choosing a different number
 * would put the decision somewhere the tower has no punctuation.
 */
export const FLOORS_PER_LEG = 10;

/**
 * Routes offered at a fork.
 *
 * Three, and one of them is always the plain way — a fork whose every branch is
 * a gamble is not a choice, it is a tax.
 */
export const PATHS_OFFERED = 3;

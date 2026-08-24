/**
 * The Boss Rush (Q39) — the ten gates, back to back.
 *
 * The tower gives you a gate every ten floors and a fresh hero every time. The
 * rush takes both away: one health bar, ten bosses, and nothing between them but
 * whatever is left of you. It is the only fight in the game that asks how deep a
 * build *goes* rather than how deep it reaches.
 *
 * Two rules keep it from becoming the way people play:
 *
 *  - **It pays for new ground only.** A run that ties your record pays nothing,
 *    exactly as a re-climb earns no echoes (Q36). What it rewards is getting
 *    further, which is the one thing the whole game rewards.
 *  - **It costs nothing to lose.** Dying in the rush does not touch the tower
 *    run. A mode that could undo an hour of climbing would be one nobody with an
 *    hour of climbing behind them would ever open.
 */

/** Gates in a rush — the ten authored bosses, in the order the tower gives them. */
export const BOSS_RUSH_GATES = 10;

/**
 * The record a hero needs before the rush is offered at all.
 *
 * The first gate: there is nothing to rush until you have met one.
 */
export const BOSS_RUSH_MIN_FLOOR = 10;

/**
 * How deep each gate is fought, as a share of the hero's own record.
 *
 * Gate *i* of ten is fought at `record × i / 10`, floored at the canonical boss
 * floor `10 × i`. At a record of 100 that is exactly the tower's own ladder —
 * 10, 20, … 100 — and past it the ten gates spread across whatever depth the
 * hero has actually earned, so the rush is a real test at floor 90 and at floor
 * 9000 alike.
 */
export const BOSS_RUSH_DEPTH_SHARE = 1 / BOSS_RUSH_GATES;

/**
 * What a gate pays, as a multiple of the boss floor it was fought at.
 *
 * Below one, and deliberately: the gate is fought at a depth the hero has
 * already cleared, on a health bar they do not get back, and the point of the
 * chest is to be worth the attempt rather than to be the best hour in the game.
 */
export const BOSS_RUSH_GATE_MULTIPLIER = 0.6;

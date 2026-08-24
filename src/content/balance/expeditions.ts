/**
 * Expeditions (Q37) — what a party sent away comes back with.
 *
 * The one number that matters is the exchange rate between **time you are not
 * playing** and **time you are**. Set it too high and the best way to play a
 * tower-climber is to close the tab; set it to nothing and the panel is a timer
 * that pays a rounding error. So expeditions are priced against the only unit
 * this game has: a floor.
 *
 * An hour away is worth `EXPEDITION_FLOORS_PER_HOUR` floors at the depth the
 * hero has actually reached. A player climbing properly clears many times that
 * in an hour, so a run always beats a wait — which is the rule the whole game
 * rests on (Brief §1). What a wait buys is the hours you were never going to
 * spend climbing anyway.
 *
 * Two things expeditions deliberately never pay:
 *
 *  - **Gear.** Every item in the game comes from a source §13 brackets, and a
 *    timer is not a place to open a fourth one.
 *  - **Echoes.** They are paid for new ground and nothing else (Q36). A currency
 *    that could be waited for would stop meaning "you got further".
 */

/**
 * Floors' worth of spoils an hour away is worth.
 *
 * Deliberately small. This is the dial to turn if expeditions ever start
 * competing with climbing rather than complementing it.
 */
export const EXPEDITION_FLOORS_PER_HOUR = 4;

/**
 * The depth an expedition is paid against, as a share of the hero's record.
 *
 * Under one, because a party without the hero does not reach as deep as the hero
 * does — and because paying the full record would make an expedition worth more
 * than the floors the player is actually able to clear right now.
 */
export const EXPEDITION_DEPTH_SHARE = 0.8;

/** How likely an hour away is to turn up a summoning ticket. */
export const EXPEDITION_TICKET_CHANCE_PER_HOUR = 0.13;

/** Materials an hour away brings back, before the mission's own weighting. */
export const EXPEDITION_MATERIALS_PER_HOUR = { min: 1, max: 3 } as const;

/**
 * Concurrent expeditions, one per character slot the account has opened.
 *
 * The §15 upgrade that buys character slots buys dispatch capacity with it,
 * which is what makes it worth something to a player with no interest in a
 * second hero — and the first slot is free, so a brand-new account can send one
 * before it has bought anything.
 */
export const EXPEDITIONS_PER_SLOT = 1;

/** An expedition can be recalled early, for none of its spoils. */
export const EXPEDITION_RECALL_PAYS_NOTHING = true;

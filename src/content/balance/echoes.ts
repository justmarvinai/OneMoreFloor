/**
 * Echoes of the Spire (Q36) — the permanent layer.
 *
 * Everything else a player builds belongs to one hero and stops when that hero
 * does. Echoes are the opposite: they are earned by the *account*, spent by the
 * account, and survive every reset — so a death banks something, and the second
 * hero is faster than the first because of what the first did.
 *
 * The one rule that makes them honest is where they come from: **new ground
 * only**. An echo is paid for a floor the account has never cleared, which means
 * they cannot be farmed by re-climbing and a player who has stopped getting
 * further has stopped earning them. That is deliberate — the currency's whole
 * job is to reward the thing the game is about.
 */

/**
 * Echoes for clearing floor `n` for the first time ever.
 *
 * A gentle staircase rather than a curve: one for the first ten floors, two for
 * the next ten, and so on. Deep ground is worth more without ever being worth so
 * much that the shallow floors feel like a waste of a climb.
 */
export function echoesForFloor(floor: number): number {
  return Math.max(1, Math.floor(Math.max(1, floor) / 10) + 1);
}

/** What each rank of a node costs, in echoes. Five ranks, steeply priced. */
export const ECHO_NODE_COST: readonly number[] = [12, 30, 72, 170, 400];

/** Ranks every node has. */
export const ECHO_MAX_RANK = ECHO_NODE_COST.length;

/**
 * What one rank of each node is worth.
 *
 * All six are in the same band on purpose: the tree is a set of *choices about
 * what to speed up first*, and a node that dwarfed the others would make the
 * order obvious and the choice fake.
 */
export const ECHO_MAGNITUDE = {
  /** Extra gold from every floor, as a fraction. */
  spoils: 0.07,
  /** Extra experience from every floor. */
  insight: 0.07,
  /** Extra materials from every floor. */
  prospect: 0.09,
  /** Extra chance of a ticket from every floor. */
  fortune: 0.14,
  /** Fraction taken off the auto-climb's wait between floors. */
  patience: 0.1,
  /** Extra backpack sockets, in whole slots per rank. */
  coffers: 2,
} as const;

export type EchoNodeId = keyof typeof ECHO_MAGNITUDE;

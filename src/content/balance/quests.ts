/**
 * Quest economy (Brief §17, shaped by Q10/Q21, BALANCE.md §9).
 *
 * The brief's target is the whole design: a daily has to be completable in a
 * day of normal play and a weekly in a week, and **neither may be trivial**.
 * That is a statement about *time*, not about numbers, so the numbers have to
 * follow the player down the tower — a "spend 400 gold" daily is a morning's
 * work on floor 8 and a rounding error on floor 300.
 *
 * So every objective target and every payout is expressed as a base times a
 * per-bracket growth factor. Growth of 1 means the target genuinely does not
 * change with depth (clearing twelve floors is twelve clicks either way);
 * anything gold-shaped grows with the gold curve it is measured against.
 */

/** Board size (Q21): three of each, one weekly always hard. */
export const QUEST_BOARD = { daily: 3, weekly: 3, hardWeeklies: 1 } as const;

/**
 * Payout scale, as a multiple of what a floor at the same depth pays. A daily
 * is worth a good handful of floors; a weekly is worth an evening; the hard
 * weekly is the one that carries the ticket odds (§17).
 */
export const QUEST_REWARD_FLOORS = { daily: 9, weekly: 40, hard: 70 } as const;

/** How much of a quest's payout arrives as materials rather than gold and XP. */
export const QUEST_MATERIAL_COUNT = { daily: { min: 1, max: 2 }, weekly: { min: 3, max: 6 } };

/**
 * Ticket odds, and only on hard quests — §17 says "for very hard quests,
 * occasionally Tickets or Lucky Tickets". Rolled when the board is built, so
 * the player can see what a quest pays before deciding to chase it.
 */
export const QUEST_TICKET_CHANCE = { hard: 0.55, hardLucky: 0.18 } as const;

/** Floor used to price a quest when the hero has never cleared one. */
export const QUEST_REFERENCE_FLOOR_MIN = 3;

/**
 * Floor for a "go deeper" target. A new hero's best floor is nearly zero, and a
 * weekly that asks them to reach floor 4 is not a quest, it is a formality.
 */
export const QUEST_MIN_DEPTH_TARGET = 15;

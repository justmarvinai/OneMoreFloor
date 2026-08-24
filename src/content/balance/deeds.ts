/**
 * Deeds (Q40) — the ledger of everything an account has ever done.
 *
 * Achievements in most games are a list of things you have already done, read
 * once and never again. These pay, and what they pay is priced against the
 * *depth the account has reached* rather than fixed at authoring time — so a
 * deed claimed at floor 40 is worth forty floors' effort and the same deed
 * claimed at floor 900 is worth nine hundred. A fixed payout would be a fortune
 * at the bottom of the tower and a rounding error at the top, and the second is
 * how an achievement list quietly stops being read.
 */

/**
 * Floors' worth of spoils each tier pays, by tier index.
 *
 * Steep, because the tiers themselves are steep: the third tier of anything on
 * the board is hundreds of hours of play, and it should read like it.
 */
export const DEED_TIER_FLOORS: readonly number[] = [8, 30, 110];

/** The depth a deed is paid against, as a share of the account's best. */
export const DEED_DEPTH_SHARE = 1;

/** Which tiers hand over a summoning ticket as well. The last one, only. */
export const DEED_TICKET_FROM_TIER = 2;

/** Materials a tier hands over, before its own scaling. */
export const DEED_MATERIALS = { min: 2, max: 5 } as const;

/**
 * Merchants and the backpack (Brief §11/§12/§14, shaped by Q16/Q17).
 *
 * The restock rhythm is the interesting number here. Six hours is long enough
 * that a player who wants different goods *now* pays for them (§14's gold
 * pressure), and short enough that waiting is a real option rather than a
 * punishment — Q17 chose the wait as the default path and the reroll as the
 * impatience tax, so the reroll price has to sting without ever being the only
 * way to progress.
 */

/** Free restock interval — Q17's "~6h real time". */
export const MERCHANT_RESTOCK_MS = 6 * 3_600_000;

/**
 * A new personal best restocks both merchants, but only every N floors: every
 * single floor would make the timer meaningless, and Q17 asked for a milestone.
 */
export const MERCHANT_MILESTONE_FLOORS = 10;

/** How many pieces each merchant puts on the shelf. */
export const MERCHANT_STOCK_SIZE = { equipment: 8, magic: 6 } as const;

/** Instant restock price, rising with the bracket like every other gold sink. */
export const MERCHANT_REROLL_COST = { base: 140, bracketFactor: 1.36 } as const;

/**
 * Gold per point of an item's stat budget. `SELL_VALUE_FRACTION` is the other
 * half of this ratio: a piece sells for roughly a fifth of what it costs, which
 * keeps the backpack a decision rather than a free gold faucet (Q16).
 */
export const BUY_PRICE_FRACTION = 0.9;

/**
 * Backpack size (Q16: "S&F-style, ~15–25 slots"). Big enough to hold a climb's
 * worth of drops, small enough that a full pack is a decision the player makes
 * every so often rather than a wall they hit once and never think about.
 */
export const INVENTORY_CAPACITY = 20;

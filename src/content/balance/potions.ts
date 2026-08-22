/**
 * Potion economy (Brief §12, shaped by Q9/Q18, BALANCE.md §9).
 *
 * Two decisions live in these numbers. **Magnitude is a percentage**, never a
 * flat point count: a +40 Strength potion is a gift at floor 10 and a rounding
 * error at floor 1000, and the tower is endless (§3.7). And **price rises with
 * the bracket faster than the benefit does**, so keeping every stat potioned is
 * a real gold decision rather than a default (§14's "always slightly short").
 */

/** One hour of real time (Brief §12, Q9: it ticks while the game is closed). */
export const POTION_DURATION_MS = 3_600_000;

/**
 * The fraction a potion adds to its stat. It creeps up with the bracket so a
 * deeper potion is worth its higher price, and it is capped so no stack of
 * potions can ever rival gear.
 */
export const POTION_MAGNITUDE = { base: 0.1, perBracket: 0.005, max: 0.24 } as const;

/** Gold price at bracket 0, and how sharply it climbs. */
export const POTION_PRICE = { base: 55, bracketFactor: 1.34 } as const;

/**
 * Floor rewards (Brief §3.6, BALANCE.md §7).
 *
 * Rewards track the enemy power curve at a slightly lower exponent, which is the
 * arithmetic behind Brief §14: climbing is always the best faucet, and power
 * still outruns income, so Gold stays the thing the player is short of.
 */

/** Gold from clearing a floor. */
export const FLOOR_GOLD = { base: 14, factor: 1.72, period: 10 } as const;

/** Experience from clearing a floor. */
export const FLOOR_XP = { base: 26, factor: 1.66, period: 10 } as const;

/** Boss floors pay more for being harder (Brief §3.2 "extra rewards"). */
export const BOSS_REWARD_MULTIPLIER = 3.2;

/** Rewards vary a little, so two runs of the same floor are not identical. */
export const REWARD_VARIANCE = { min: 0.88, max: 1.12 } as const;

/** Chance a cleared floor drops a piece of equipment at all. */
export const EQUIPMENT_DROP_CHANCE = 0.34;
export const BOSS_EQUIPMENT_DROP_CHANCE = 1;

/** Chance of a crafting material, and how many. */
export const MATERIAL_DROP_CHANCE = 0.42;
export const BOSS_MATERIAL_DROP_CHANCE = 1;
export const MATERIAL_COUNT = { min: 1, max: 3 } as const;
export const BOSS_MATERIAL_COUNT = { min: 3, max: 6 } as const;

/**
 * Rarity weights for a dropped piece, by depth band. Early tables carry no
 * Legendary at all and a vanishing Mythical weight, which is how §9.2's arc —
 * "early game caps out at Epic; Legendary becomes obtainable later; Mythical
 * must be insanely rare" — becomes a number rather than a hope.
 */
export const RARITY_WEIGHTS: readonly {
  fromBracket: number;
  weights: Readonly<Record<string, number>>;
}[] = [
  {
    fromBracket: 0,
    weights: { common: 62, uncommon: 27, rare: 9, epic: 2, legendary: 0, mythic: 0.02 },
  },
  {
    fromBracket: 6,
    weights: { common: 44, uncommon: 32, rare: 17, epic: 6.5, legendary: 0.5, mythic: 0.03 },
  },
  {
    fromBracket: 14,
    weights: { common: 26, uncommon: 32, rare: 26, epic: 13, legendary: 2.8, mythic: 0.05 },
  },
  {
    fromBracket: 24,
    weights: { common: 12, uncommon: 24, rare: 32, epic: 24, legendary: 7.5, mythic: 0.08 },
  },
];

/**
 * Tickets are gacha currency and a genuine event (Brief §16.1). These are the
 * per-floor odds; hard quests (§17) and the tutorial (§18) are the other faucets.
 */
export const TICKET_DROP_CHANCE = 0.012;
export const BOSS_TICKET_DROP_CHANCE = 0.06;
export const LUCKY_TICKET_DROP_CHANCE = 0.0015;
export const BOSS_LUCKY_TICKET_DROP_CHANCE = 0.008;

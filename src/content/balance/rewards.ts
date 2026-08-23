/**
 * Floor rewards (Brief §3.6, BALANCE.md §7).
 *
 * Rewards track the enemy power curve at a slightly lower exponent, which is the
 * arithmetic behind Brief §14: climbing is always the best faucet, and power
 * still outruns income, so Gold stays the thing the player is short of.
 */

/** Gold from clearing a floor. */
export const FLOOR_GOLD = { base: 24, factor: 1.72, period: 10 } as const;

/** Experience from clearing a floor. */
export const FLOOR_XP = { base: 26, factor: 1.66, period: 10 } as const;

/** Boss floors pay more for being harder (Brief §3.2 "extra rewards"). */
export const BOSS_REWARD_MULTIPLIER = 3.2;

/** Rewards vary a little, so two runs of the same floor are not identical. */
export const REWARD_VARIANCE = { min: 0.88, max: 1.12 } as const;

/**
 * How often a floor hands over a piece of equipment.
 *
 * **The tower pays in currency; gear is an event.** At a third of floors a
 * player was handed so much gear that the pieces they already owned never
 * mattered: whatever was in the bag beat whatever was worn, so upgrading a piece
 * was money spent on something that would be replaced two floors later. That
 * turns §10's whole investment loop — levels, stars, materials — into a system
 * with no reason to touch it.
 *
 * So an ordinary floor almost never drops gear, a boss almost always does, and
 * bosses can hand over two. What the tower pays every floor instead is gold and
 * materials — which buy gear from the merchants *by choice*, and improve the
 * piece already worn.
 */
export const EQUIPMENT_DROP_CHANCE = 0.06;
export const BOSS_EQUIPMENT_DROP_CHANCE = 0.9;

/** Chance a boss that dropped one piece drops a second (Brief §3.2's "extra"). */
export const BOSS_EQUIPMENT_SECOND_CHANCE = 0.35;

/**
 * Chance of a crafting material, and how many.
 *
 * Raised alongside the drop cut: ascension is now the main way a piece gets
 * better, and a path with no fuel is not a path (§10.2).
 */
export const MATERIAL_DROP_CHANCE = 0.58;
export const BOSS_MATERIAL_DROP_CHANCE = 1;
export const MATERIAL_COUNT = { min: 1, max: 3 } as const;
export const BOSS_MATERIAL_COUNT = { min: 4, max: 8 } as const;

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

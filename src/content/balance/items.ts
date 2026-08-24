/**
 * Item balance — brackets, rarity, affixes and gear upgrade costs.
 *
 * **This file is where the brief's anti-overshoot rule actually lives** (§13).
 * The bracket table below decides how strong an item *can* be at a given Power
 * Level; rarity only decides where inside that range it lands. No item source
 * gets to widen the range, which is why "a Level 12 hero on Floor 21 finds a
 * +1000 Strength chestplate" is not a bug we guard against but an item that
 * cannot be constructed.
 *
 * Every number here is provisional and tuned in M9 against the simulator
 * (BALANCE.md §10).
 */
import type { Rarity } from '@/domain/items/types.ts';
import type { StatId } from '@/domain/stats.ts';

/**
 * Reference stat budget by bracket. A bracket is a band of Power Level; the
 * budget is the total "stat points" an item of that band is worth before rarity
 * decides its position in the window.
 *
 * Growth is exponential so the curve stays meaningful at floor 10, floor 500 and
 * floor 5000 (Brief §3.7). Bracket 0 is the starting band.
 */
/**
 * How many brackets the ladder covers. The formula is unbounded — a bracket is
 * computed, never authored — so this is the depth the *tests* sweep and the
 * point past which the ladder stops growing. At the tuned rates it reaches
 * roughly floor 1,100, well past any realistic EA 0.1 climb.
 */
export const BRACKET_COUNT = 200;

/**
 * Power Level at which each bracket begins.
 *
 * **The factor deliberately equals `BRACKET_BUDGET_FACTOR`, and the base sits
 * above nine times `BRACKET_BASE_BUDGET`** (M9). Those two facts together are
 * what stop gear from lifting its own bracket: gear is weight 1 in Power Level,
 * so a hero wearing nine items of budget *b* carries about 9*b* of gear power,
 * and if that were enough to reach the next bracket the loop would bootstrap
 * itself — which is exactly what the first M9 measurement found. It plateaued a
 * no-shop climber at bracket ~18 and put the first death wall at floor 80
 * instead of the 15–25 §10 asks for.
 *
 * With the factors matched and the base above the loop's break-even, gear's
 * contribution is self-limiting and **depth** decides the bracket (see
 * `POWER_TOWER_CURVE`). That is the brief's own sentence made mechanical:
 * Power Level decides the bracket, and the tower is most of Power Level.
 */
export const BRACKET_POWER_STEP = { base: 320, factor: 1.42, period: 1 } as const;

/** Reference budget for bracket 0, growing by `BUDGET_FACTOR` per bracket. */
export const BRACKET_BASE_BUDGET = 26;
export const BRACKET_BUDGET_FACTOR = 1.42;

/**
 * The window an item's budget may occupy, as multiples of the bracket's
 * reference budget.
 *
 * **Narrowed deliberately.** At 0.55–2.4 a lucky drop was worth four times an
 * unlucky one *of the same bracket*, which made finding gear the whole game:
 * whatever fell out of the tower next was likely to beat anything already owned,
 * so the levels and stars in §10 were money spent on something about to be
 * thrown away. At 0.72–1.58 one drop is at most a bit over twice another, while
 * a piece taken to level 15 and five stars is worth about 3.7× its base — so
 * **investment beats luck**, which is the shape §10 was written for.
 *
 * Rarity still matters; it just stops mattering mostly through raw budget. Its
 * job is the affix count and where inside this window a piece lands.
 */
export const BUDGET_WINDOW = { min: 0.72, max: 1.58 } as const;

/**
 * Where each rarity sits inside the window, as a fraction of it. Ranges overlap
 * slightly so a lucky rare can edge out an unlucky epic — the texture that makes
 * comparing two drops interesting rather than arithmetic.
 */
export const RARITY_WINDOW_POSITION: Readonly<Record<Rarity, { min: number; max: number }>> = {
  common: { min: 0.0, max: 0.12 },
  uncommon: { min: 0.1, max: 0.28 },
  rare: { min: 0.25, max: 0.48 },
  epic: { min: 0.45, max: 0.7 },
  legendary: { min: 0.68, max: 0.9 },
  mythic: { min: 0.88, max: 1.0 },
};

/**
 * Affix counts at gear ascension 0, by rarity (Brief §10.2: "1 or 2, 2 is the
 * maximum"). Higher rarities are likelier to roll the second slot.
 */
export const RARITY_SECOND_AFFIX_CHANCE: Readonly<Record<Rarity, number>> = {
  common: 0.15,
  uncommon: 0.35,
  rare: 0.6,
  epic: 0.85,
  legendary: 1.0,
  mythic: 1.0,
};

/**
 * Affix slots by gear ascension (Brief §10.2 as resolved by Q3). Index is the
 * ascension tier; tier 0 is handled by the rarity roll above, capped at 2.
 */
export const AFFIX_SLOTS_BY_ASCENSION: readonly number[] = [2, 2, 2, 3, 4, 5];

/**
 * What one point of each stat costs from an item's budget. Health is cheap per
 * point, so armour shows big HP numbers; Speed is expensive, because it is the
 * gear-only stat and the scarcest thing on any piece (Brief §6).
 */
export const STAT_BUDGET_COST: Readonly<Record<StatId, number>> = {
  strength: 1,
  defense: 1,
  // Health is the cheapest stat per point, so armour shows big satisfying
  // numbers — but not so cheap that one common shield doubles a level-1 hero's
  // health pool, which is where this started before it was tuned down.
  hp: 0.25,
  resource: 0.85,
  luck: 1.15,
  speed: 2.6,
};

/**
 * Multiplier on an item's affix values from gear level (Brief §10.1). Level 15
 * is worth about +90% over level 0 — a real reason to push, not a second item,
 * and since the drop window narrowed it is *the* reason a piece gets better.
 */
export const GEAR_LEVEL_STAT_BONUS_PER_LEVEL = 0.06;

/**
 * Multiplier from gear ascension stars (Brief §10.2: "increases its stats by more
 * than a normal level-up does"), plus the extra affix slots above.
 *
 * Five stars nearly doubles a piece. Together with level 15 that is about 3.7×
 * its base — comfortably more than the 2.2× spread the drop window now allows,
 * which is what makes keeping one piece and building it the winning play.
 */
export const GEAR_ASCENSION_STAT_BONUS: readonly number[] = [0, 0.12, 0.27, 0.45, 0.68, 0.95];

/**
 * Gold cost to take a piece from `level` to `level + 1`, **as a multiple of the
 * item's own worth** (Brief §10.1, retuned in M9).
 *
 * Dimensionless on purpose. The gold price is `budget × ITEM_GOLD_PER_BUDGET ×
 * this`, so an upgrade automatically costs what the piece is worth at any depth
 * and there is no second per-bracket factor to drift out of step with the first.
 *
 * Levels 1–10 are a gentle polynomial the player upgrades freely — about five
 * times the item's worth in total, a session's income across a full set. 11–15
 * turn sharply exponential and cost roughly nine times what 1–10 did: §10.1's
 * "worth pushing", priced to be a goal rather than a toll gate.
 */
export const GEAR_LEVEL_COST = {
  early: { base: 0.22, coefficient: 0.02, exponent: 1.75 },
  late: { factor: 1.95, period: 1, offsetLevel: 10, offsetCost: 1.4 },
  lateStartsAt: 10,
} as const;

/** Rarity multiplier on upgrade costs: better gear is dearer to improve. */
export const GEAR_LEVEL_COST_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 0.7,
  uncommon: 0.85,
  rare: 1,
  epic: 1.3,
  legendary: 1.7,
  mythic: 2.2,
};

/**
 * Materials to take a piece from `stars` to `stars + 1` (Brief §10.2: "multiple
 * different materials found in the tower"). Counts rise per star, and deeper
 * stars demand higher-tier materials — which ties gear ascension to *climbing*
 * rather than to grinding one floor.
 */
export const GEAR_ASCENSION_COST: readonly {
  /** Material tiers required, relative to the item's bracket tier. */
  tiers: readonly number[];
  /** How many of each. */
  counts: readonly number[];
  /**
   * Gold as a multiple of the item's own worth (M9), like `GEAR_LEVEL_COST` —
   * so a star costs what the piece is worth at any depth. All five together run
   * to about 125× the item's value, roughly twice what taking it to level 15
   * costs, which is right: a star also opens an affix slot.
   */
  goldMultiplier: number;
}[] = [
  { tiers: [0], counts: [4], goldMultiplier: 2.5 },
  { tiers: [0, 1], counts: [8, 3], goldMultiplier: 6 },
  { tiers: [0, 1], counts: [14, 8], goldMultiplier: 14 },
  { tiers: [1, 2], counts: [18, 10], goldMultiplier: 32 },
  { tiers: [1, 2], counts: [26, 16], goldMultiplier: 72 },
];

/**
 * Fraction of an item's worth recovered by selling it to a merchant (Q16). Low
 * enough that selling is inventory management rather than an income strategy —
 * Gold must stay the thing the player is always slightly short of (Brief §14).
 */
export const SELL_VALUE_FRACTION = 0.18;

/**
 * Salvage (fifth polish round) — the other thing to do with a piece you do not
 * want.
 *
 * Selling pays gold; salvaging pays the materials that ascension eats. The two
 * are deliberately not interchangeable: after this round's drop retune the
 * tower hands over gold and materials rather than gear, so the pieces that do
 * arrive are worth *more* as fuel for what you are already building than as one
 * more line in the purse. There is no roll — a player deciding between two
 * irreversible options deserves to be told exactly what each one gives.
 */
export const SALVAGE_BASE_COUNT = 2;

/** Extra material per rarity: a mythic was worth more to break than a common. */
export const SALVAGE_RARITY_BONUS: Readonly<Record<Rarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 5,
  mythic: 8,
};

/** Gear levels give a fraction of their gold back as material, rounded down. */
export const SALVAGE_LEVEL_BONUS = 0.25;

/**
 * Each star returns two of the piece's own tier and one of the tier above,
 * because that is roughly the shape of what ascending it consumed. Not all of
 * it: salvage is a change of mind, and a change of mind costs something.
 */
export const SALVAGE_ASCENSION_BONUS = 2;
export const SALVAGE_ASCENSION_HIGH_TIER_PER_STAR = 1;

/**
 * Reforge (fifth polish round) — reroll which stats a piece carries.
 *
 * The gamble is *which* affixes and how the budget splits, inside the same
 * window the piece was born in. Two consequences, both deliberate: a reforge can
 * never overshoot the bracket that produced the item (§13), and a player willing
 * to spend can eventually reach the budget the luckiest possible drop would have
 * had — investment reaching what luck could, which is the shape §10 asks for.
 *
 * Priced as a real sink rather than a formality: over half the piece's worth in
 * gold, plus materials that only the depth it came from yields.
 */
export const REFORGE_GOLD_MULTIPLIER = 0.55;
export const REFORGE_MATERIAL_COUNT = 3;

/**
 * The workbench (Q43) — what a tier of material is worth in the tier above it.
 *
 * Materials are tiered by depth, which ties ascension to *climbing*. It also
 * means every material a player outgrows becomes dead weight: a hero at floor
 * 300 holds a pile of Spire Dust that no recipe will ever ask for again. Five
 * for one is deliberately a bad rate — transmuting is a way to *rescue* a
 * stockpile, never a way to farm the shallow floors for deep material, because
 * five-to-one compounds to 3,125-to-one across five tiers and the tower pays
 * better than that at every depth.
 */
export const TRANSMUTE_RATE = 5;

/**
 * Brewing a draught from materials instead of gold (Q43).
 *
 * Q29 settled that buying a potion *drinks* it — there is no potion inventory,
 * and brewing does not introduce one: a brewed draught is drunk on the spot,
 * at the hero's own bracket, exactly like a bought one. What it changes is the
 * currency, so a player rich in materials and short on gold has a way to spend
 * what they have.
 */
export const BREW_MATERIAL_COST = 4;

/**
 * The gacha (Brief §16, Q20).
 *
 * A pull goes through **the same door every other item source uses**. There is
 * no gacha-specific item generator, which is precisely why §16.2's "all gacha
 * rewards are bracketed by Power Level, no overshooting" needs no gacha-specific
 * guard: the permanent property test that sweeps drops and merchant shelves
 * sweeps pulls too, because they are the same function call.
 *
 * A pull is also **replayable**. Each one draws from a named stream seeded by
 * the character's run seed and their pull count, so a save plus a pull number
 * reproduces exactly what came out — the same discipline fights and shop
 * shelves already keep (ARCHITECTURE §5).
 */
import { createRng } from '@/app/rng.ts';
import { evaluate } from '@/content/balance/curves.ts';
import { FLOOR_GOLD } from '@/content/balance/rewards.ts';
import {
  BLUFF_LADDER,
  bannerConfig,
  type BannerEntry,
  type BannerId,
} from '@/content/balance/gacha.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES } from '@/content/items/index.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import type { Character } from '../character/types.ts';
import { availableSlots } from '../items/equip.ts';
import { defsForBracket, generateItem, pickBase } from '../items/generate.ts';
import { isFull } from '../items/inventory.ts';
import { rarityIndex, type ItemInstance, type Rarity } from '../items/types.ts';
import type { Bracket } from '../power/brackets.ts';
import type { FloorReward } from '../tower/rewards.ts';

export type { BannerId };

export interface PullResult {
  banner: BannerId;
  /** Which table entry came up, for the reveal and for a bug report. */
  entryId: string;
  /** The rarity the reveal escalates to. Null for a bundle outcome. */
  rarity: Rarity | null;
  item: ItemInstance | null;
  /** Gold and materials, banked through the same path floors and quests use. */
  reward: FloorReward;
  /**
   * How high the reveal is allowed to tease, on the rarity ladder (§16.3).
   *
   * It lives on the result rather than in the animation because the animation
   * has to be replayable too: a bug report that says "it staged a Mythical and
   * gave me ore" has to reproduce from the save, bluff included.
   */
  bluff: number;
}

export type PullRefusal = 'noCurrency' | 'backpackFull';

/** How many of a banner's currency the character holds. */
export function currencyHeld(character: Character, banner: BannerId): number {
  return character.currencies[bannerConfig(banner).currency];
}

export function canPull(
  character: Character,
  banner: BannerId,
  capacity: number,
): true | PullRefusal {
  if (currencyHeld(character, banner) < 1) return 'noCurrency';
  // Gear has to land somewhere, and a pull that quietly evaporated would be the
  // worst possible way to spend the rarest currency in the game (Q16).
  if (isFull(character, capacity)) return 'backpackFull';
  return true;
}

export interface PullInput {
  character: Character;
  banner: BannerId;
  bracket: Bracket;
  /** Which pull this is, so the stream is distinct and the draw replayable. */
  pullNumber: number;
}

/**
 * Resolve one pull.
 *
 * Pure: it decides *what came out* and leaves spending the ticket and banking
 * the result to the caller, which is what lets a test draw ten thousand pulls
 * without a save layer anywhere near it.
 */
export function pull(input: PullInput): PullResult {
  const { character, banner, bracket, pullNumber } = input;
  const config = bannerConfig(banner);
  const rng = createRng(`${character.tower.runSeed}/gacha:${banner}:${pullNumber}`);

  const entry = rng.weighted(
    config.entries.map((candidate) => ({ value: candidate, weight: candidate.weight })),
  );

  // Drawn from its own stream so adding or removing a beat later cannot shift
  // what the pull itself paid out.
  const bluffRoll = rng
    .fork('bluff')
    .weighted(BLUFF_LADDER.map((step) => ({ value: step.rank, weight: step.weight })));

  const empty: FloorReward = {
    gold: 0,
    xp: 0,
    materials: {},
    items: [],
    tickets: 0,
    luckyTickets: 0,
  };

  switch (entry.payout.kind) {
    case 'gear': {
      const item = rollGear(character, bracket, entry.payout.rarity, rng.fork('gear'), pullNumber);
      return {
        banner,
        entryId: entry.id,
        rarity: item ? entry.payout.rarity : null,
        item,
        // A bracket with no wearable base is unreachable in practice; paying the
        // gold consolation rather than nothing keeps Q20's promise regardless.
        reward: item ? empty : { ...empty, gold: goldFor(character, 12) },
        bluff: Math.max(bluffRoll, item ? rarityIndex(entry.payout.rarity) : 0),
      };
    }

    case 'materials': {
      const count = rng.int(entry.payout.count.min, entry.payout.count.max);
      return {
        banner,
        entryId: entry.id,
        rarity: null,
        item: null,
        reward: { ...empty, materials: { [materialIdForTier(bracket.materialTier)]: count } },
        bluff: bluffRoll,
      };
    }

    case 'gold':
      return {
        banner,
        entryId: entry.id,
        rarity: null,
        item: null,
        reward: { ...empty, gold: goldFor(character, entry.payout.floors) },
        bluff: bluffRoll,
      };
  }
}

/** Gear the player can actually wear, generated through the one door (§13). */
function rollGear(
  character: Character,
  bracket: Bracket,
  rarity: Rarity,
  rng: ReturnType<typeof createRng>,
  pullNumber: number,
): ItemInstance | null {
  const wearable = new Set<string>(availableSlots(character.progression.ascension));
  const candidates = defsForBracket(ITEM_BASES, bracket.index).filter(
    (def) =>
      wearable.has(def.slot) &&
      (def.classId === null || def.classId === character.identity.classId),
  );
  if (candidates.length === 0) return null;

  /**
   * The wish list (fifth polish round).
   *
   * It steers **which slot** a gear prize arrives in and nothing else: not its
   * rarity, not where in the window its budget lands, not whether this pull pays
   * gear at all. That is what keeps it pity-free and keeps the printed table
   * honest — every number on the rates card is about rarity, and none of them
   * moves. A wish for a slot this bracket cannot fill is simply not applied,
   * rather than turning the prize into nothing.
   */
  const wished = character.wishlist
    ? candidates.filter((def) => def.slot === character.wishlist)
    : [];
  const pool = wished.length > 0 ? wished : candidates;

  const def = pickBase(pool, rarity, rng);
  if (!def) return null;

  return generateItem({
    def,
    rarity,
    bracket,
    weights: affixPool(def.affixPool),
    rng: rng.fork(`item:${def.id}`),
    uid: `pull-${pullNumber}-${def.id}-${rarity}`,
  });
}

/** Gold priced as floors' worth of income, so a bundle keeps its worth forever. */
function goldFor(character: Character, floors: number): number {
  const depth = Math.max(3, character.tower.highestFloorEverCleared);
  return Math.max(1, Math.round(evaluate({ kind: 'exponential', ...FLOOR_GOLD }, depth) * floors));
}

/** Spend the pull's currency. The caller has already checked it is there. */
export function spendCurrency(character: Character, banner: BannerId): Character {
  const currency = bannerConfig(banner).currency;
  return {
    ...character,
    currencies: { ...character.currencies, [currency]: character.currencies[currency] - 1 },
  };
}

export type { BannerEntry };

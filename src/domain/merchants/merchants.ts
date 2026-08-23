/**
 * The two merchants (Brief §11/§12, Q17, Q22).
 *
 * **Stock is derived, never stored.** A merchant's save state is a seed, a
 * timestamp, the bracket it was rolled for, and which entries have been bought.
 * Everything on the shelf is regenerated from that seed on demand. It keeps the
 * save small, it makes a shop replayable in a bug report the way a fight is, and
 * it means the stock cannot drift out of agreement with the rules that produced
 * it (ARCHITECTURE §5).
 *
 * **Stock comes through the same door as every drop** — `generateItem` against
 * the character's own bracket — so Brief §13's anti-overshoot guarantee covers
 * merchants without a second guard to keep in sync. The property test sweeps
 * merchant stock exactly as it sweeps drops.
 */
import { createRng, type Rng } from '@/app/rng.ts';
import {
  MERCHANT_MILESTONE_FLOORS,
  MERCHANT_REROLL_COST,
  MERCHANT_RESTOCK_MS,
  MERCHANT_STOCK_SIZE,
  BUY_PRICE_FRACTION,
} from '@/content/balance/merchants.ts';
import { GEAR_LEVEL_COST, GEAR_LEVEL_COST_BY_RARITY } from '@/content/balance/items.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES } from '@/content/items/index.ts';
import { potionsForBracket, type PotionDef } from '@/content/items/potions.ts';
import type { Character } from '../character/types.ts';
import { availableSlots } from '../items/equip.ts';
import { defsForBracket, generateItem } from '../items/generate.ts';
import type { ItemInstance } from '../items/types.ts';
import type { Bracket } from '../power/brackets.ts';
import { rarityWeightsFor } from '../tower/rewards.ts';
import { MERCHANT_IDS, type MerchantId, type MerchantState, type MerchantsState } from './types.ts';

export { MERCHANT_IDS };
export type { MerchantId, MerchantState, MerchantsState };

/** Slots each merchant deals in (Brief §11 vs §12). */
const SLOTS: Readonly<Record<MerchantId, readonly string[]>> = {
  equipment: [
    'helmet',
    'chest',
    'leggings',
    'boots',
    'gauntlets',
    'cape',
    'wrists',
    'mainhand',
    'offhand',
  ],
  magic: ['ring', 'necklace', 'amulet', 'relic', 'artifact'],
};

export function createMerchants(runSeed: string, now: number): MerchantsState {
  const state = (id: MerchantId): MerchantState => ({
    stockSeed: stockSeedFor(id, runSeed, now),
    stockedAt: now,
    bracketAtStock: 0,
    floorAtStock: 0,
    sold: [],
  });
  return { equipment: state('equipment'), magic: state('magic') };
}

export interface RestockContext {
  now: number;
  bracketIndex: number;
  highestFloor: number;
}

/**
 * Whether the shelf is stale.
 *
 * Three things age it out. The clock, which is Q17's six-hour rhythm. A new
 * best-floor milestone, which is Q17's reward for climbing. And a change of
 * bracket — a shelf rolled for a weaker hero is not merely boring, it is
 * unbuyable junk the player has visibly outgrown (§13).
 */
export function needsRestock(state: MerchantState, context: RestockContext): boolean {
  if (context.now - state.stockedAt >= MERCHANT_RESTOCK_MS) return true;
  if (context.bracketIndex !== state.bracketAtStock) return true;
  return milestoneOf(context.highestFloor) > milestoneOf(state.floorAtStock);
}

function milestoneOf(floor: number): number {
  return Math.floor(floor / MERCHANT_MILESTONE_FLOORS);
}

/** When the free restock lands (Q17). */
export function nextRestockAt(state: MerchantState): number {
  return state.stockedAt + MERCHANT_RESTOCK_MS;
}

/**
 * Fill the shelf again.
 *
 * The seed is derived from the run and the moment it was filled, so it is
 * distinct on every restock without the state having to carry a counter — and a
 * bug report can reproduce a shelf from the two numbers already in the save.
 */
export function restock(id: MerchantId, runSeed: string, context: RestockContext): MerchantState {
  return {
    stockSeed: stockSeedFor(id, runSeed, context.now),
    stockedAt: context.now,
    bracketAtStock: context.bracketIndex,
    floorAtStock: context.highestFloor,
    sold: [],
  };
}

function stockSeedFor(id: MerchantId, runSeed: string, at: number): string {
  return `${runSeed}/shop:${id}:${at}`;
}

/** What an instant restock costs — impatience is a gold sink (Q17). */
export function rerollCost(bracketIndex: number): number {
  const { base, bracketFactor } = MERCHANT_REROLL_COST;
  return Math.round(base * Math.pow(bracketFactor, Math.max(0, bracketIndex)));
}

/** What a merchant asks for a piece. Sell value is a fraction of this (Q16). */
export function buyPrice(item: ItemInstance): number {
  const bracketScale = Math.pow(GEAR_LEVEL_COST.bracketFactor, item.bracketAtDrop);
  return Math.max(
    1,
    Math.round(
      item.budget * BUY_PRICE_FRACTION * bracketScale * GEAR_LEVEL_COST_BY_RARITY[item.rarity],
    ),
  );
}

export interface StockEntry {
  index: number;
  item: ItemInstance;
  price: number;
  sold: boolean;
}

/**
 * The shelf, regenerated from the seed.
 *
 * Relics and artifacts appear only once the hero can wear them (Q22) — the same
 * gate the tower's drops use, so no merchant ever sells dead weight.
 */
export function stockOf(
  id: MerchantId,
  character: Character,
  state: MerchantState,
  bracket: Bracket,
): StockEntry[] {
  const wearable = new Set<string>(availableSlots(character.progression.ascension));
  const dealt = new Set(SLOTS[id]);

  const candidates = defsForBracket(ITEM_BASES, bracket.index).filter(
    (def) =>
      dealt.has(def.slot) &&
      wearable.has(def.slot) &&
      (def.classId === null || def.classId === character.identity.classId),
  );
  if (candidates.length === 0) return [];

  const sold = new Set(state.sold);
  const size = MERCHANT_STOCK_SIZE[id];
  const entries: StockEntry[] = [];

  for (let index = 0; index < size; index += 1) {
    // One stream per slot on the shelf, so buying entry 3 cannot change entry 4.
    const rng: Rng = createRng(`${state.stockSeed}/slot:${index}`);
    const def = rng.pick(candidates);
    const item = generateItem({
      def,
      rarity: rng.weighted(rarityWeightsFor(bracket.index)),
      bracket,
      weights: affixPool(def.affixPool),
      rng: rng.fork('item'),
      uid: `shop-${id}-${state.stockedAt}-${index}`,
    });
    entries.push({ index, item, price: buyPrice(item), sold: sold.has(index) });
  }

  return entries;
}

/** The magic merchant's draughts — one per stat, brewed for this bracket (§12). */
export function potionStock(bracket: Bracket): PotionDef[] {
  return potionsForBracket(bracket.index);
}

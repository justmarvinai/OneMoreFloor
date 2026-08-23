/**
 * Merchant vocabulary.
 *
 * Split from the rules so `character/types.ts` can hold a merchant's state
 * without importing the module that reads a character — the cycle that would
 * otherwise exist between them.
 */

export const MERCHANT_IDS = ['equipment', 'magic'] as const;
export type MerchantId = (typeof MERCHANT_IDS)[number];

export interface MerchantState {
  /** Everything on the shelf is regenerated from this. */
  stockSeed: string;
  /** Wall-clock time the shelf was filled, for the restock countdown. */
  stockedAt: number;
  /** The bracket the stock was rolled for. */
  bracketAtStock: number;
  /** The hero's best floor when it was filled, for the milestone restock (Q17). */
  floorAtStock: number;
  /** Indices already bought out of this stock. */
  sold: number[];
}

export type MerchantsState = Record<MerchantId, MerchantState>;

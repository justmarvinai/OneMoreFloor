/**
 * The backpack (Q16).
 *
 * A finite bag is a design choice, not a limitation: it is what makes a drop a
 * decision. Two rules follow from that and are enforced here rather than at the
 * call sites:
 *
 *  - **A full backpack never silently eats a drop.** Adding returns a refusal
 *    the caller has to handle, which is what lets the tower open the resolution
 *    dialog Q16 asked for instead of losing the item quietly.
 *  - **Selling is the pressure valve**, at the configured fraction of an item's
 *    worth — a minor faucet that keeps the pack honest without denting §14.
 */
import { INVENTORY_CAPACITY } from '@/content/balance/merchants.ts';
import type { Character } from '../character/types.ts';
import { sellValue } from './upgrade.ts';
import type { ItemInstance } from './types.ts';

export { INVENTORY_CAPACITY };

export function inventoryCapacity(): number {
  return INVENTORY_CAPACITY;
}

export function freeSlots(character: Character): number {
  return Math.max(0, INVENTORY_CAPACITY - character.inventory.length);
}

export function isFull(character: Character): boolean {
  return freeSlots(character) === 0;
}

export type AddResult =
  { ok: true; character: Character } | { ok: false; reason: 'full'; character: Character };

/** Put an item in the pack, or say why not. */
export function addToInventory(character: Character, item: ItemInstance): AddResult {
  if (isFull(character)) return { ok: false, reason: 'full', character };
  return { ok: true, character: { ...character, inventory: [...character.inventory, item] } };
}

export function findInInventory(character: Character, uid: string): ItemInstance | undefined {
  return character.inventory.find((item) => item.uid === uid);
}

export function removeFromInventory(character: Character, uid: string): Character {
  return { ...character, inventory: character.inventory.filter((item) => item.uid !== uid) };
}

export interface SaleResult {
  character: Character;
  item: ItemInstance;
  gold: number;
}

/** Sell one piece to a merchant (Q16). Returns null if it is not in the pack. */
export function sellFromInventory(character: Character, uid: string): SaleResult | null {
  const item = findInInventory(character, uid);
  if (!item) return null;

  const gold = sellValue(item);
  const sold = removeFromInventory(character, uid);
  return {
    item,
    gold,
    character: {
      ...sold,
      currencies: { ...sold.currencies, gold: sold.currencies.gold + gold },
    },
  };
}

/**
 * The piece the game would suggest parting with — least valuable first.
 *
 * Used by the full-backpack dialog so "sell the worst piece and keep the new
 * one" is one button rather than a hunt through twenty rows.
 */
export function leastValuable(character: Character): ItemInstance | null {
  let worst: ItemInstance | null = null;
  let worstValue = Number.POSITIVE_INFINITY;
  for (const item of character.inventory) {
    const value = sellValue(item);
    if (value < worstValue) {
      worst = item;
      worstValue = value;
    }
  }
  return worst;
}

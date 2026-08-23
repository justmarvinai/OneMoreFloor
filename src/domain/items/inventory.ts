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
import type { Character } from '../character/types.ts';
import { sellValue } from './upgrade.ts';
import type { ItemInstance } from './types.ts';

/**
 * Capacity is passed in rather than read from a constant.
 *
 * The bag is an account upgrade now (§15, Q30), which makes its size a *number
 * the caller knows* — `backpackCapacity(account)` — rather than a fact about the
 * game. Passing it keeps the domain free of account plumbing and makes every
 * call site say which bag it means, which matters the moment two heroes on one
 * account are both holding things.
 */
export function freeSlots(character: Character, capacity: number): number {
  return Math.max(0, capacity - character.inventory.length);
}

export function isFull(character: Character, capacity: number): boolean {
  return freeSlots(character, capacity) === 0;
}

export type AddResult =
  { ok: true; character: Character } | { ok: false; reason: 'full'; character: Character };

/** Put an item in the pack, or say why not. */
export function addToInventory(
  character: Character,
  item: ItemInstance,
  capacity: number,
): AddResult {
  if (isFull(character, capacity)) return { ok: false, reason: 'full', character };
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

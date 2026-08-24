/**
 * Wearing things (Brief §9.1, Q15, Q16).
 *
 * `equip.ts` decides whether a piece *may* go in a slot; this moves it, and the
 * moving is where the awkward cases live. Equipping a two-hander empties the
 * offhand into the backpack (Q15). Equipping anything at all sends whatever was
 * worn back to the backpack — which can be full (Q16), and a swap that silently
 * destroyed the old piece would be the worst bug in the game.
 *
 * So every path returns either a whole new character or a reason, and the caller
 * cannot accidentally take the happy path.
 */
import type { Character, EquipSlotId } from '../character/types.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { canEquip, isOffhandBlocked, type EquipRefusal } from './equip.ts';
import { findInInventory } from './inventory.ts';
import type { ItemInstance } from './types.ts';

export type LoadoutRefusal = EquipRefusal | 'notFound' | 'backpackFull';

export type LoadoutResult =
  | { ok: true; character: Character; displaced: ItemInstance[] }
  | { ok: false; reason: LoadoutRefusal };

/**
 * Put a backpack item on.
 *
 * The slot is the item's own — an item belongs in exactly one place (§9.1), so
 * there is nothing for a caller to get wrong and no way to ask for a slot the
 * piece does not fit.
 */
export function equipFromInventory(
  character: Character,
  uid: string,
  capacity: number,
): LoadoutResult {
  const item = findInInventory(character, uid);
  if (!item) return { ok: false, reason: 'notFound' };

  const def = requireItemDef(item.defId);
  const slot = def.slot;
  const mainhand = character.equipment.mainhand;

  const check = canEquip(def, slot, {
    classId: character.identity.classId,
    ascension: character.progression.ascension,
    mainhand: mainhand ? requireItemDef(mainhand.defId) : null,
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  const equipment = { ...character.equipment };
  const displaced: ItemInstance[] = [];

  const worn = equipment[slot];
  if (worn) displaced.push(worn);
  equipment[slot] = item;

  // A two-hander occupies the offhand rather than sharing it (Q15).
  if (slot === 'mainhand' && isOffhandBlocked(def)) {
    const offhand = equipment.offhand;
    if (offhand) {
      displaced.push(offhand);
      delete equipment.offhand;
    }
  }

  const inventory = character.inventory.filter((entry) => entry.uid !== uid);
  if (inventory.length + displaced.length > capacity) {
    return { ok: false, reason: 'backpackFull' };
  }

  return {
    ok: true,
    displaced,
    character: { ...character, equipment, inventory: [...inventory, ...displaced] },
  };
}

/** Take a piece off and put it in the backpack, if there is room for it. */
export function unequip(character: Character, slot: EquipSlotId, capacity: number): LoadoutResult {
  const worn = character.equipment[slot];
  if (!worn) return { ok: false, reason: 'notFound' };
  if (character.inventory.length >= capacity) {
    return { ok: false, reason: 'backpackFull' };
  }

  const equipment = { ...character.equipment };
  delete equipment[slot];

  return {
    ok: true,
    displaced: [worn],
    character: { ...character, equipment, inventory: [...character.inventory, worn] },
  };
}

/** Slots a character can see on their paperdoll, locked ones included (§7/§9.1). */
export function isSlotUsable(character: Character, slot: EquipSlotId): boolean {
  if (slot !== 'offhand') return true;
  const mainhand = character.equipment.mainhand;
  return !isOffhandBlocked(mainhand ? requireItemDef(mainhand.defId) : null);
}

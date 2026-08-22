/**
 * The item catalogue.
 *
 * Lookups the generator and the UI need, computed once from the base list.
 * Adding an item is a line in `bases.ts` plus its string — no logic changes
 * anywhere (Brief §2.3).
 */
import type { ClassId, EquipSlotId } from '@/domain/character/types.ts';
import type { ItemDef } from '@/domain/items/types.ts';
import { ITEM_BASES } from './bases.ts';

export { ITEM_BASES } from './bases.ts';
export { AFFIX_POOLS, affixPool } from './affixPools.ts';
export {
  MATERIALS,
  MAX_MATERIAL_TIER,
  getMaterial,
  materialForTier,
  materialIdForTier,
} from './materials.ts';

const BY_ID = new Map(ITEM_BASES.map((def) => [def.id, def]));

export function getItemDef(id: string): ItemDef | undefined {
  return BY_ID.get(id);
}

/** Throws rather than returning undefined — a dangling item id is a content bug. */
export function requireItemDef(id: string): ItemDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown item definition: ${id}`);
  return def;
}

/**
 * Bases a character of this class could ever use in this slot: armour and
 * accessories are universal, weapons are theirs alone (Brief §8.2).
 */
export function defsForSlot(slot: EquipSlotId, classId: ClassId): ItemDef[] {
  return ITEM_BASES.filter(
    (def) => def.slot === slot && (def.classId === null || def.classId === classId),
  );
}

/** Every base a class could ever equip, across all slots. */
export function defsForClass(classId: ClassId): ItemDef[] {
  return ITEM_BASES.filter((def) => def.classId === null || def.classId === classId);
}

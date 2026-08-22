/**
 * The gear a hero begins with (Brief §5, Q15).
 *
 * "The hero starts with **only** their class weapon(s) equipped. Every other
 * equipment slot starts empty and must be farmed, bought, or gambled for." That
 * emptiness is the point — a paperdoll full of holes is the first thing the game
 * asks the player to fix.
 *
 * Per Q15 the Warrior starts with a one-handed weapon and a shield, which teaches
 * the shield loadout and makes their first two-handed drop an actual decision;
 * the Swashbuckler starts with both hands full.
 */
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES } from '@/content/items/index.ts';
import type { Rng } from '@/app/rng.ts';
import type { ClassId, EquipSlotId } from '../character/types.ts';
import { bracketAt } from '../power/brackets.ts';
import { generateItem } from './generate.ts';
import type { ItemDef, ItemInstance } from './types.ts';

/** The exact bases each class opens with. */
const STARTING_LOADOUTS: Readonly<Record<ClassId, readonly string[]>> = {
  // Q15: a plain blade and a shield, not a greatsword.
  warrior: ['item.mainhand.warrior-arming-sword', 'item.offhand.warrior-warded-shield'],
  mage: ['item.mainhand.mage-apprentice-staff'],
  hunter: ['item.mainhand.hunter-hunting-bow'],
  bard: ['item.mainhand.bard-travelers-lute'],
  // Q15: both hands full from the first fight.
  swashbuckler: ['item.mainhand.swash-jade-dagger', 'item.offhand.swash-parrying-dagger'],
};

function findBase(id: string): ItemDef {
  const def = ITEM_BASES.find((base) => base.id === id);
  if (!def) throw new Error(`starting loadout references unknown item: ${id}`);
  return def;
}

/**
 * Build a hero's starting equipment.
 *
 * Rolled through the ordinary generator at the lowest bracket, common rarity —
 * so a starting weapon is a real item with real rolls, not a special case the
 * rest of the game has to know about. Seeded from the character, so a hero's
 * first weapon is the same every time their creation is replayed.
 */
export function createStartingEquipment(
  classId: ClassId,
  rng: Rng,
): Partial<Record<EquipSlotId, ItemInstance>> {
  const bracket = bracketAt(0);
  const equipment: Partial<Record<EquipSlotId, ItemInstance>> = {};

  for (const [index, defId] of STARTING_LOADOUTS[classId].entries()) {
    const def = findBase(defId);
    equipment[def.slot] = generateItem({
      def,
      rarity: 'common',
      bracket,
      weights: affixPool(def.affixPool),
      rng: rng.fork(`starting:${index}`),
      uid: `start-${classId}-${index}`,
    });
  }

  return equipment;
}

/** The bases a class starts with, for previews that need them before creation. */
export function startingLoadoutFor(classId: ClassId): ItemDef[] {
  return STARTING_LOADOUTS[classId].map(findBase);
}

/**
 * Item sets (Q45) — a reason to want a *particular* piece.
 *
 * Before these, one helmet was better than another only by its budget, so the
 * wish list had nothing to wish for and a saved loadout was one stat block
 * against another. A set gives the six armour slots a shape to fill, and gives
 * "should I keep this?" an answer that is not just a bigger number.
 *
 * Set pieces are *bases*, not a mark rolled onto an instance, and they span the
 * whole bracket ladder: an Ironbound Helm found on floor 12 and one found on
 * floor 1,200 are the same base with stats sized for the depth that produced
 * them, exactly like every other item. That is what keeps a set worth chasing in
 * an endless tower — nothing about it goes obsolete except its numbers, and
 * those are rerolled by the reforge.
 *
 * Each set names **one stat per threshold**; how much that threshold is worth
 * lives in `content/balance/uniques.ts` (§3.7).
 */
import type { StatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

export interface SetDef {
  id: string;
  nameKey: StringKey;
  descKey: StringKey;
  /** The stat each threshold raises, in threshold order (2, 4, then 6 pieces). */
  raises: readonly StatId[];
}

export const ITEM_SETS: readonly SetDef[] = [
  {
    id: 'set.ironbound',
    nameKey: 'set.ironbound',
    descKey: 'set.ironbound.desc',
    raises: ['defense', 'hp', 'defense'],
  },
  {
    id: 'set.emberflow',
    nameKey: 'set.emberflow',
    descKey: 'set.emberflow.desc',
    raises: ['strength', 'resource', 'strength'],
  },
  {
    /**
     * The one set that raises Speed, and the only place in the game outside a
     * rolled affix that a point of it can come from — which is legal precisely
     * because a set bonus *is* gear (Brief §6).
     */
    id: 'set.whisperstep',
    nameKey: 'set.whisperstep',
    descKey: 'set.whisperstep.desc',
    raises: ['speed', 'luck', 'speed'],
  },
];

export function getSet(id: string): SetDef | undefined {
  return ITEM_SETS.find((set) => set.id === id);
}

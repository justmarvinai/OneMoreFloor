/**
 * The workbench (Q43) — what to do with materials you have outgrown.
 *
 * Materials are tiered by depth (Brief §10.2), which is what ties ascension to
 * climbing rather than to grinding one comfortable floor. It has a cost nobody
 * noticed until the drop retune made materials the tower's main pay: every tier
 * a player climbs past becomes dead weight. A hero at floor 300 holds a pile of
 * Spire Dust that no recipe will ever ask for again, and a resource that can
 * only ever accumulate is a resource that stops being a reward.
 *
 * Two answers, both at the Alchemist's counter:
 *
 *  - **Transmute** five of a tier into one of the tier above. Deliberately a bad
 *    rate: it rescues a stockpile, it does not farm one. Five-to-one compounds
 *    to 3,125-to-one across five tiers, and the tower pays better than that at
 *    every depth, so nobody will ever climb *down* for material.
 *  - **Brew** a draught from materials instead of gold. Q29 settled that buying
 *    a potion drinks it; brewing does not introduce an inventory either — the
 *    draught is drunk on the spot, at the hero's own bracket, exactly like a
 *    bought one. All that changes is which pocket it comes out of.
 */
import { BREW_MATERIAL_COST, TRANSMUTE_RATE } from '@/content/balance/items.ts';
import {
  MATERIALS,
  MAX_MATERIAL_TIER,
  getMaterial,
  materialForTier,
} from '@/content/items/materials.ts';
import type { MaterialDef } from './types.ts';

export { BREW_MATERIAL_COST, TRANSMUTE_RATE };

export interface TransmuteStep {
  /** What is consumed, and how much of it. */
  from: MaterialDef;
  cost: number;
  /** What one press yields. */
  to: MaterialDef;
  yield: number;
  /** How many the player holds of the source right now. */
  held: number;
  /** How many presses they could afford. Zero means the row is a preview. */
  affordable: number;
}

/**
 * Every rung of the ladder, with what the player could do on each right now.
 *
 * The whole ladder is returned rather than only the affordable rungs: a bench
 * that shows nothing until you are rich enough to use it teaches nobody what it
 * is for, and the deepest tier's absence from the list is itself information —
 * there is nothing above it to make.
 */
export function transmuteLadder(materials: Readonly<Record<string, number>>): TransmuteStep[] {
  const steps: TransmuteStep[] = [];

  for (const material of MATERIALS) {
    if (material.tier >= MAX_MATERIAL_TIER) continue;
    const held = materials[material.id] ?? 0;
    steps.push({
      from: material,
      cost: TRANSMUTE_RATE,
      to: materialForTier(material.tier + 1),
      yield: 1,
      held,
      affordable: Math.floor(held / TRANSMUTE_RATE),
    });
  }

  return steps;
}

export type TransmuteRefusal = 'noSuchMaterial' | 'atCeiling' | 'notEnoughMaterials';

export interface TransmuteResult {
  materials: Record<string, number>;
  /** What was made, so the toast can name it. */
  made: MaterialDef;
  count: number;
}

/**
 * Push one rung up the ladder.
 *
 * `times` exists so a player sitting on four hundred of something is not asked
 * to press a button eighty times; it is clamped to what they can actually pay
 * for rather than refused, because "you asked for eighty and can do sixty-one"
 * has an obviously right answer.
 */
export function transmute(
  materials: Readonly<Record<string, number>>,
  materialId: string,
  times = 1,
): TransmuteResult | TransmuteRefusal {
  const source = getMaterial(materialId);
  if (!source) return 'noSuchMaterial';
  if (source.tier >= MAX_MATERIAL_TIER) return 'atCeiling';

  const held = materials[materialId] ?? 0;
  const runs = Math.min(Math.max(1, Math.floor(times)), Math.floor(held / TRANSMUTE_RATE));
  if (runs < 1) return 'notEnoughMaterials';

  const made = materialForTier(source.tier + 1);
  const next = { ...materials };
  next[materialId] = held - runs * TRANSMUTE_RATE;
  next[made.id] = (next[made.id] ?? 0) + runs;

  return { materials: next, made, count: runs };
}

/** How much of which material a draught costs at this depth. */
export function brewCost(bracketMaterialTier: number): { materialId: string; count: number } {
  return { materialId: materialForTier(bracketMaterialTier).id, count: BREW_MATERIAL_COST };
}

/** True when the pouch covers a brew at this depth. */
export function canBrew(
  materials: Readonly<Record<string, number>>,
  bracketMaterialTier: number,
): boolean {
  const cost = brewCost(bracketMaterialTier);
  return (materials[cost.materialId] ?? 0) >= cost.count;
}

/** Pay for a brew. The caller has already checked it can be paid for. */
export function spendBrew(
  materials: Readonly<Record<string, number>>,
  bracketMaterialTier: number,
): Record<string, number> {
  const cost = brewCost(bracketMaterialTier);
  return {
    ...materials,
    [cost.materialId]: (materials[cost.materialId] ?? 0) - cost.count,
  };
}

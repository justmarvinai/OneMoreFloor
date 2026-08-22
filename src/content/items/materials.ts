/**
 * Gear-ascension materials (Brief §10.2).
 *
 * Materials are tiered by depth, which is what ties ascending a piece to
 * *climbing* rather than to grinding one comfortable floor: the material a
 * five-star piece needs simply does not exist on the floors you have already
 * beaten.
 */
import type { MaterialDef } from '@/domain/items/types.ts';

/** One material per tier; tier 0 drops on the shallowest floors. */
export const MATERIALS: readonly MaterialDef[] = [
  { id: 'mat.spire-dust', nameKey: 'material.spireDust', icon: 'earth-cobble-glow', tier: 0 },
  { id: 'mat.iron-sigil', nameKey: 'material.ironSigil', icon: 'rune-bronze-disc', tier: 1 },
  { id: 'mat.ember-core', nameKey: 'material.emberCore', icon: 'fire-molten-heart', tier: 2 },
  { id: 'mat.frost-quartz', nameKey: 'material.frostQuartz', icon: 'earth-quartz-beam', tier: 3 },
  { id: 'mat.void-shard', nameKey: 'material.voidShard', icon: 'earth-obsidian-rift', tier: 4 },
  { id: 'mat.astral-seal', nameKey: 'material.astralSeal', icon: 'rune-emerald-seal', tier: 5 },
  { id: 'mat.dragon-ash', nameKey: 'material.dragonAsh', icon: 'fire-dragon-eye', tier: 6 },
  { id: 'mat.spire-heart', nameKey: 'material.spireHeart', icon: 'earth-crystal-bloom', tier: 7 },
];

export const MAX_MATERIAL_TIER = MATERIALS.length - 1;

const BY_TIER = new Map(MATERIALS.map((material) => [material.tier, material]));

/**
 * The material for a tier. Tiers past the deepest defined one clamp to it, so a
 * bracket beyond the authored range still has something to ask for rather than
 * producing an unsatisfiable requirement.
 */
export function materialForTier(tier: number): MaterialDef {
  const clamped = Math.max(0, Math.min(MAX_MATERIAL_TIER, Math.floor(tier)));
  const material = BY_TIER.get(clamped);
  if (!material) throw new Error(`no material defined for tier ${clamped}`);
  return material;
}

export function materialIdForTier(tier: number): string {
  return materialForTier(tier).id;
}

export function getMaterial(id: string): MaterialDef | undefined {
  return MATERIALS.find((material) => material.id === id);
}

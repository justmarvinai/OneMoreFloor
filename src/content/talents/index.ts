/**
 * The talent registry (Q38).
 *
 * One tree per class, in tier order. Adding a class is a new file here and one
 * line below; rebalancing a tree is a number in `src/content/balance/talents.ts`
 * (Brief §2.3, §3.7).
 */
import { CLASS_IDS, type ClassId } from '@/domain/character/types.ts';
import { bard } from './bard.ts';
import { hunter } from './hunter.ts';
import { mage } from './mage.ts';
import { swashbuckler } from './swashbuckler.ts';
import { warrior } from './warrior.ts';
import type { TalentDef } from './types.ts';

export type { TalentDef, TalentEffect, TalentEffectKind } from './types.ts';
export { talentGlyph, TALENT_GLYPH } from './types.ts';

export const TALENT_TREES: Readonly<Record<ClassId, readonly TalentDef[]>> = {
  warrior,
  mage,
  hunter,
  bard,
  swashbuckler,
};

/** Every talent in the game, whatever class it belongs to. */
export const ALL_TALENTS: readonly TalentDef[] = CLASS_IDS.flatMap((id) => TALENT_TREES[id]);

export function talentsFor(classId: ClassId): readonly TalentDef[] {
  return TALENT_TREES[classId];
}

const BY_ID = new Map(ALL_TALENTS.map((def) => [def.id, def]));

/** Look one up by the id a save stores. Unknown ids return undefined. */
export function getTalent(id: string): TalentDef | undefined {
  return BY_ID.get(id);
}

/** How many rows a class's tree has. */
export function tierCount(classId: ClassId): number {
  return talentsFor(classId).reduce((deepest, def) => Math.max(deepest, def.tier + 1), 0);
}

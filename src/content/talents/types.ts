/**
 * The shape of a talent (Q38).
 *
 * Talents are content (Brief §2.3): a sixth class is a new file in this folder,
 * and rebalancing one is a number in `src/content/balance/talents.ts`. Nothing
 * in `src/domain/` knows what any individual talent is called or does — it reads
 * the effect kind and applies the magnitude for it.
 *
 * The one rule the type system enforces rather than documents: a stat talent
 * names an `UpgradableStatId`, which excludes Speed. Gear is Speed's only source
 * (Brief §6), and a tree that could raise it would be a balance bug nobody finds
 * for months.
 */
import type { ClassId } from '@/domain/character/types.ts';
import type { UpgradableStatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

/**
 * What a talent does. Every kind is a lever the engine or the reward roll
 * already has — a talent never introduces a new rule, it turns an existing dial.
 */
export type TalentEffect =
  /** Adds a share of the hero's durable total for one stat. Never Speed (§6). */
  | { kind: 'stat'; stat: UpgradableStatId }
  /** Signature-move damage. */
  | { kind: 'signature' }
  /** How fast the resource bar fills. */
  | { kind: 'resourceFill' }
  /** The extra damage a critical hit deals, not how often one lands. */
  | { kind: 'critDamage' }
  /** A share of every incoming blow, turned aside. Hard-capped. */
  | { kind: 'damageReduction' }
  /** Healed at the end of each round, as a share of the hero's pool. */
  | { kind: 'regeneration' }
  /** Gold a floor pays. */
  | { kind: 'gold' }
  /** Experience a floor teaches. */
  | { kind: 'xp' }
  /** Materials a floor gives up. */
  | { kind: 'materials' };

export type TalentEffectKind = TalentEffect['kind'];

export interface TalentDef {
  /** Stable id, stored in the save: `talent.<class>.<name>`. */
  id: string;
  classId: ClassId;
  /** Row in the tree, 0-based. Deeper rows cost more and open later. */
  tier: number;
  nameKey: StringKey;
  descriptionKey: StringKey;
  effect: TalentEffect;
}

/**
 * One mark per effect, not per talent.
 *
 * Every "+Strength" node in the game wears the same glyph, so a player reads an
 * unfamiliar class's tree by shape before they have read a word of it. Fifty-five
 * bespoke marks would say less, not more.
 */
export const TALENT_GLYPH: Readonly<Record<string, string>> = {
  strength: 'glyph-fist-punch',
  defense: 'glyph-shield-block',
  hp: 'glyph-ribcage-armor',
  resource: 'glyph-spirit-vortex',
  luck: 'glyph-shooting-stars',
  signature: 'glyph-sword-clash',
  resourceFill: 'glyph-magic-flame',
  critDamage: 'glyph-spiked-cleaver',
  damageReduction: 'glyph-nature-shield',
  regeneration: 'glyph-health-potion',
  gold: 'glyph-trophy-cup',
  xp: 'glyph-spell-book',
  materials: 'glyph-hammer-hit',
};

/** The mark a talent wears, chosen by what it does. */
export function talentGlyph(effect: TalentEffect): string {
  const key = effect.kind === 'stat' ? effect.stat : effect.kind;
  return TALENT_GLYPH[key] ?? 'glyph-arcane-symbol';
}

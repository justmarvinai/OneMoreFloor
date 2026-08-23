import type { ClassDef } from './types.ts';

/**
 * Hunter — the one that scales with Luck. Crits feed her resource and her
 * signature multiplies crit chances again, so every point of Luck compounds
 * twice (Q26).
 *
 * Stat values are provisional and tuned in M9 against the simulator (BALANCE.md §10).
 */
export const hunter: ClassDef = {
  id: 'hunter',
  nameKey: 'class.hunter.name',
  taglineKey: 'class.hunter.tagline',
  descriptionKey: 'class.hunter.description',
  resource: {
    kind: 'mana',
    nameKey: 'resource.mana',
    fillDescriptionKey: 'class.hunter.resource.fill',
  },
  signature: {
    nameKey: 'class.hunter.signature.name',
    descriptionKey: 'class.hunter.signature.description',
    glyph: 'glyph-bow-and-arrow',
  },
  weaponRule: 'two_handed',
  weaponDescriptionKey: 'class.hunter.weapon',
  baseStats: { strength: 13, defense: 8, hp: 98, resource: 11, luck: 13 },
  statGrowthPerLevel: { strength: 2.0, defense: 1.4, hp: 11, resource: 1.6, luck: 2.0 },
  art: { portrait: 'class-hunter', glyph: 'glyph-bow-and-arrow' },
  difficulty: 2,
};

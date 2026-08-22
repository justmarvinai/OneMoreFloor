import type { ClassDef } from './types.ts';

/**
 * Swashbuckler — the tempo one. Two one-handed weapons mean two Speed rolls, and
 * Focus builds from the dodges and double attacks that Speed buys, so the class
 * either snowballs or falls over (Q26).
 *
 * Stat values are provisional and tuned in M9 against the simulator (BALANCE.md §10).
 */
export const swashbuckler: ClassDef = {
  id: 'swashbuckler',
  nameKey: 'class.swashbuckler.name',
  taglineKey: 'class.swashbuckler.tagline',
  descriptionKey: 'class.swashbuckler.description',
  resource: {
    kind: 'focus',
    nameKey: 'resource.focus',
    fillDescriptionKey: 'class.swashbuckler.resource.fill',
  },
  signature: {
    nameKey: 'class.swashbuckler.signature.name',
    descriptionKey: 'class.swashbuckler.signature.description',
    glyph: 'glyph-broken-shackle',
  },
  weaponRule: 'dual_one_handed',
  weaponDescriptionKey: 'class.swashbuckler.weapon',
  baseStats: { strength: 13, defense: 6, hp: 85, resource: 12, luck: 13 },
  statGrowthPerLevel: { strength: 2.1, defense: 1.0, hp: 9, resource: 1.7, luck: 2.0 },
  art: { portrait: 'class-swashbuckler', glyph: 'glyph-broken-shackle' },
  difficulty: 3,
};

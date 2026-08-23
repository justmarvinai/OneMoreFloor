import type { ClassDef } from './types.ts';

/**
 * Bard — the self-buffing one. His songs make him the least swingy class in the
 * game, at the cost of never posting the biggest number on any single hit (Q26).
 *
 * Stat values are provisional and tuned in M9 against the simulator (BALANCE.md §10).
 */
export const bard: ClassDef = {
  id: 'bard',
  nameKey: 'class.bard.name',
  taglineKey: 'class.bard.tagline',
  descriptionKey: 'class.bard.description',
  resource: {
    kind: 'mana',
    nameKey: 'resource.mana',
    fillDescriptionKey: 'class.bard.resource.fill',
  },
  signature: {
    nameKey: 'class.bard.signature.name',
    descriptionKey: 'class.bard.signature.description',
    glyph: 'glyph-celestial-body',
  },
  weaponRule: 'two_handed',
  weaponDescriptionKey: 'class.bard.weapon',
  baseStats: { strength: 12, defense: 10, hp: 110, resource: 13, luck: 10 },
  statGrowthPerLevel: { strength: 1.9, defense: 1.6, hp: 13, resource: 1.9, luck: 1.5 },
  art: { portrait: 'class-bard', glyph: 'glyph-celestial-body' },
  difficulty: 3,
};

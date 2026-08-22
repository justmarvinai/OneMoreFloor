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
  baseStats: { strength: 10, defense: 9, hp: 100, resource: 13, luck: 9 },
  statGrowthPerLevel: { strength: 1.6, defense: 1.5, hp: 12, resource: 1.9, luck: 1.4 },
  art: { portrait: 'class-bard', glyph: 'glyph-celestial-body' },
  difficulty: 3,
};

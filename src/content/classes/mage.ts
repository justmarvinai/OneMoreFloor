import type { ClassDef } from './types.ts';

/**
 * Mage — the burst one. Mana on a fixed per-round clock makes her damage
 * predictable in timing and enormous in size, paid for with the thinnest
 * defensive stats of the five (Q26).
 *
 * Stat values are provisional and tuned in M9 against the simulator (BALANCE.md §10).
 */
export const mage: ClassDef = {
  id: 'mage',
  nameKey: 'class.mage.name',
  taglineKey: 'class.mage.tagline',
  descriptionKey: 'class.mage.description',
  resource: {
    kind: 'mana',
    nameKey: 'resource.mana',
    fillDescriptionKey: 'class.mage.resource.fill',
  },
  signature: {
    nameKey: 'class.mage.signature.name',
    descriptionKey: 'class.mage.signature.description',
    glyph: 'glyph-arcane-symbol',
  },
  weaponRule: 'two_handed',
  weaponDescriptionKey: 'class.mage.weapon',
  baseStats: { strength: 15, defense: 7, hp: 90, resource: 14, luck: 8 },
  statGrowthPerLevel: { strength: 2.5, defense: 1.2, hp: 10, resource: 2.0, luck: 1.2 },
  art: { portrait: 'class-mage', glyph: 'glyph-arcane-symbol' },
  difficulty: 2,
};

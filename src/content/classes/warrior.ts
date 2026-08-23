import type { ClassDef } from './types.ts';

/**
 * Warrior — the durable one. Rage from both giving and taking damage means his
 * signature lands more often the longer a fight runs, which is exactly the fight
 * his health pool lets him have (Q26).
 *
 * Stat values are provisional and tuned in M9 against the simulator (BALANCE.md §10).
 */
export const warrior: ClassDef = {
  id: 'warrior',
  nameKey: 'class.warrior.name',
  taglineKey: 'class.warrior.tagline',
  descriptionKey: 'class.warrior.description',
  resource: {
    kind: 'rage',
    nameKey: 'resource.rage',
    fillDescriptionKey: 'class.warrior.resource.fill',
  },
  signature: {
    nameKey: 'class.warrior.signature.name',
    descriptionKey: 'class.warrior.signature.description',
    glyph: 'glyph-crossed-swords',
  },
  weaponRule: 'one_hand_shield_or_two_handed',
  weaponDescriptionKey: 'class.warrior.weapon',
  baseStats: { strength: 10, defense: 11, hp: 124, resource: 10, luck: 5 },
  statGrowthPerLevel: { strength: 1.6, defense: 1.8, hp: 13, resource: 1.4, luck: 0.8 },
  art: { portrait: 'class-warrior', glyph: 'glyph-crossed-swords' },
  difficulty: 1,
};

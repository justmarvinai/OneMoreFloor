import type { TalentDef } from './types.ts';

/**
 * The Warrior's tree — take it, then give it back.
 *
 * His rage fills from both halves of a brawl (Q26), so the tree pays for staying
 * in one: mitigation early, a heal between rounds in the middle, and two
 * capstones that make the long fight his to win.
 */
export const warrior: readonly TalentDef[] = [
  {
    id: 'talent.warrior.brawn',
    classId: 'warrior',
    tier: 0,
    nameKey: 'talent.warrior.brawn',
    descriptionKey: 'talent.warrior.brawn.desc',
    effect: { kind: 'stat', stat: 'strength' },
  },
  {
    id: 'talent.warrior.thickHide',
    classId: 'warrior',
    tier: 0,
    nameKey: 'talent.warrior.thickHide',
    descriptionKey: 'talent.warrior.thickHide.desc',
    effect: { kind: 'stat', stat: 'defense' },
  },
  {
    id: 'talent.warrior.deepLungs',
    classId: 'warrior',
    tier: 0,
    nameKey: 'talent.warrior.deepLungs',
    descriptionKey: 'talent.warrior.deepLungs.desc',
    effect: { kind: 'stat', stat: 'hp' },
  },
  {
    id: 'talent.warrior.ironSkin',
    classId: 'warrior',
    tier: 1,
    nameKey: 'talent.warrior.ironSkin',
    descriptionKey: 'talent.warrior.ironSkin.desc',
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'talent.warrior.rageBorn',
    classId: 'warrior',
    tier: 1,
    nameKey: 'talent.warrior.rageBorn',
    descriptionKey: 'talent.warrior.rageBorn.desc',
    effect: { kind: 'resourceFill' },
  },
  {
    id: 'talent.warrior.spoilsOfWar',
    classId: 'warrior',
    tier: 1,
    nameKey: 'talent.warrior.spoilsOfWar',
    descriptionKey: 'talent.warrior.spoilsOfWar.desc',
    effect: { kind: 'gold' },
  },
  {
    id: 'talent.warrior.secondWind',
    classId: 'warrior',
    tier: 2,
    nameKey: 'talent.warrior.secondWind',
    descriptionKey: 'talent.warrior.secondWind.desc',
    effect: { kind: 'regeneration' },
  },
  {
    id: 'talent.warrior.cleavingBlows',
    classId: 'warrior',
    tier: 2,
    nameKey: 'talent.warrior.cleavingBlows',
    descriptionKey: 'talent.warrior.cleavingBlows.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.warrior.scavenger',
    classId: 'warrior',
    tier: 2,
    nameKey: 'talent.warrior.scavenger',
    descriptionKey: 'talent.warrior.scavenger.desc',
    effect: { kind: 'materials' },
  },
  {
    id: 'talent.warrior.unbreakable',
    classId: 'warrior',
    tier: 3,
    nameKey: 'talent.warrior.unbreakable',
    descriptionKey: 'talent.warrior.unbreakable.desc',
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'talent.warrior.warCry',
    classId: 'warrior',
    tier: 3,
    nameKey: 'talent.warrior.warCry',
    descriptionKey: 'talent.warrior.warCry.desc',
    effect: { kind: 'signature' },
  },
];

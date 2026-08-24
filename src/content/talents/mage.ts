import type { TalentDef } from './types.ts';

/**
 * The Mage's tree — the bar, and what it buys.
 *
 * Her resource is a clock rather than a reaction (Q26), so every rank that fills
 * it faster is a Blast landing sooner. The tree leans into that: two of the four
 * deepest ranks are about the signature, and the rest keep a glass cannon
 * standing long enough to fire it.
 */
export const mage: readonly TalentDef[] = [
  {
    id: 'talent.mage.arcaneFocus',
    classId: 'mage',
    tier: 0,
    nameKey: 'talent.mage.arcaneFocus',
    descriptionKey: 'talent.mage.arcaneFocus.desc',
    effect: { kind: 'stat', stat: 'strength' },
  },
  {
    id: 'talent.mage.deepWell',
    classId: 'mage',
    tier: 0,
    nameKey: 'talent.mage.deepWell',
    descriptionKey: 'talent.mage.deepWell.desc',
    effect: { kind: 'stat', stat: 'resource' },
  },
  {
    id: 'talent.mage.wardingSigil',
    classId: 'mage',
    tier: 0,
    nameKey: 'talent.mage.wardingSigil',
    descriptionKey: 'talent.mage.wardingSigil.desc',
    effect: { kind: 'stat', stat: 'defense' },
  },
  {
    id: 'talent.mage.quickenedCasting',
    classId: 'mage',
    tier: 1,
    nameKey: 'talent.mage.quickenedCasting',
    descriptionKey: 'talent.mage.quickenedCasting.desc',
    effect: { kind: 'resourceFill' },
  },
  {
    id: 'talent.mage.runicInsight',
    classId: 'mage',
    tier: 1,
    nameKey: 'talent.mage.runicInsight',
    descriptionKey: 'talent.mage.runicInsight.desc',
    effect: { kind: 'xp' },
  },
  {
    id: 'talent.mage.manaShield',
    classId: 'mage',
    tier: 1,
    nameKey: 'talent.mage.manaShield',
    descriptionKey: 'talent.mage.manaShield.desc',
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'talent.mage.overchannel',
    classId: 'mage',
    tier: 2,
    nameKey: 'talent.mage.overchannel',
    descriptionKey: 'talent.mage.overchannel.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.mage.elementalFury',
    classId: 'mage',
    tier: 2,
    nameKey: 'talent.mage.elementalFury',
    descriptionKey: 'talent.mage.elementalFury.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.mage.transmuterEye',
    classId: 'mage',
    tier: 2,
    nameKey: 'talent.mage.transmuterEye',
    descriptionKey: 'talent.mage.transmuterEye.desc',
    effect: { kind: 'materials' },
  },
  {
    id: 'talent.mage.archmage',
    classId: 'mage',
    tier: 3,
    nameKey: 'talent.mage.archmage',
    descriptionKey: 'talent.mage.archmage.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.mage.leylineTap',
    classId: 'mage',
    tier: 3,
    nameKey: 'talent.mage.leylineTap',
    descriptionKey: 'talent.mage.leylineTap.desc',
    effect: { kind: 'resourceFill' },
  },
];

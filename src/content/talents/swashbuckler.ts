import type { TalentDef } from './types.ts';

/**
 * The Swashbuckler's tree — luck, sharpened.
 *
 * Focus comes from dodging and from striking twice (Q26), both of which are
 * chances rather than certainties — so the tree buys the *size* of what happens
 * when they land rather than more chances at them. Speed is untouchable here by
 * type as well as by design: gear is its only source (Brief §6).
 */
export const swashbuckler: readonly TalentDef[] = [
  {
    id: 'talent.swashbuckler.sinewAndSpring',
    classId: 'swashbuckler',
    tier: 0,
    nameKey: 'talent.swashbuckler.sinewAndSpring',
    descriptionKey: 'talent.swashbuckler.sinewAndSpring.desc',
    effect: { kind: 'stat', stat: 'strength' },
  },
  {
    id: 'talent.swashbuckler.fortunesFavour',
    classId: 'swashbuckler',
    tier: 0,
    nameKey: 'talent.swashbuckler.fortunesFavour',
    descriptionKey: 'talent.swashbuckler.fortunesFavour.desc',
    effect: { kind: 'stat', stat: 'luck' },
  },
  {
    id: 'talent.swashbuckler.windRead',
    classId: 'swashbuckler',
    tier: 0,
    nameKey: 'talent.swashbuckler.windRead',
    descriptionKey: 'talent.swashbuckler.windRead.desc',
    effect: { kind: 'stat', stat: 'resource' },
  },
  {
    id: 'talent.swashbuckler.riposte',
    classId: 'swashbuckler',
    tier: 1,
    nameKey: 'talent.swashbuckler.riposte',
    descriptionKey: 'talent.swashbuckler.riposte.desc',
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'talent.swashbuckler.pickpocket',
    classId: 'swashbuckler',
    tier: 1,
    nameKey: 'talent.swashbuckler.pickpocket',
    descriptionKey: 'talent.swashbuckler.pickpocket.desc',
    effect: { kind: 'gold' },
  },
  {
    id: 'talent.swashbuckler.duellistsRhythm',
    classId: 'swashbuckler',
    tier: 1,
    nameKey: 'talent.swashbuckler.duellistsRhythm',
    descriptionKey: 'talent.swashbuckler.duellistsRhythm.desc',
    effect: { kind: 'resourceFill' },
  },
  {
    id: 'talent.swashbuckler.precision',
    classId: 'swashbuckler',
    tier: 2,
    nameKey: 'talent.swashbuckler.precision',
    descriptionKey: 'talent.swashbuckler.precision.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.swashbuckler.quickStudy',
    classId: 'swashbuckler',
    tier: 2,
    nameKey: 'talent.swashbuckler.quickStudy',
    descriptionKey: 'talent.swashbuckler.quickStudy.desc',
    effect: { kind: 'xp' },
  },
  {
    id: 'talent.swashbuckler.feintingFlurry',
    classId: 'swashbuckler',
    tier: 2,
    nameKey: 'talent.swashbuckler.feintingFlurry',
    descriptionKey: 'talent.swashbuckler.feintingFlurry.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.swashbuckler.bladeDance',
    classId: 'swashbuckler',
    tier: 3,
    nameKey: 'talent.swashbuckler.bladeDance',
    descriptionKey: 'talent.swashbuckler.bladeDance.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.swashbuckler.devilsOwnLuck',
    classId: 'swashbuckler',
    tier: 3,
    nameKey: 'talent.swashbuckler.devilsOwnLuck',
    descriptionKey: 'talent.swashbuckler.devilsOwnLuck.desc',
    effect: { kind: 'critDamage' },
  },
];

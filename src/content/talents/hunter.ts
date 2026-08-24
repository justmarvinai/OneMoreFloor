import type { TalentDef } from './types.ts';

/**
 * The Hunter's tree — every arrow counts twice.
 *
 * His bar fills on hits and fills harder on crits (Q26), which makes crit damage
 * and volley damage the same investment made twice. The tree says so plainly:
 * two of its ranks sharpen the crit, two sharpen the Volley, and the capstones
 * are one of each.
 */
export const hunter: readonly TalentDef[] = [
  {
    id: 'talent.hunter.steadyHands',
    classId: 'hunter',
    tier: 0,
    nameKey: 'talent.hunter.steadyHands',
    descriptionKey: 'talent.hunter.steadyHands.desc',
    effect: { kind: 'stat', stat: 'strength' },
  },
  {
    id: 'talent.hunter.keenEye',
    classId: 'hunter',
    tier: 0,
    nameKey: 'talent.hunter.keenEye',
    descriptionKey: 'talent.hunter.keenEye.desc',
    effect: { kind: 'stat', stat: 'luck' },
  },
  {
    id: 'talent.hunter.endurance',
    classId: 'hunter',
    tier: 0,
    nameKey: 'talent.hunter.endurance',
    descriptionKey: 'talent.hunter.endurance.desc',
    effect: { kind: 'stat', stat: 'hp' },
  },
  {
    id: 'talent.hunter.killerInstinct',
    classId: 'hunter',
    tier: 1,
    nameKey: 'talent.hunter.killerInstinct',
    descriptionKey: 'talent.hunter.killerInstinct.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.hunter.trophyHunter',
    classId: 'hunter',
    tier: 1,
    nameKey: 'talent.hunter.trophyHunter',
    descriptionKey: 'talent.hunter.trophyHunter.desc',
    effect: { kind: 'gold' },
  },
  {
    id: 'talent.hunter.bracing',
    classId: 'hunter',
    tier: 1,
    nameKey: 'talent.hunter.bracing',
    descriptionKey: 'talent.hunter.bracing.desc',
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'talent.hunter.rapidNocking',
    classId: 'hunter',
    tier: 2,
    nameKey: 'talent.hunter.rapidNocking',
    descriptionKey: 'talent.hunter.rapidNocking.desc',
    effect: { kind: 'resourceFill' },
  },
  {
    id: 'talent.hunter.fieldDressing',
    classId: 'hunter',
    tier: 2,
    nameKey: 'talent.hunter.fieldDressing',
    descriptionKey: 'talent.hunter.fieldDressing.desc',
    effect: { kind: 'materials' },
  },
  {
    id: 'talent.hunter.huntersMark',
    classId: 'hunter',
    tier: 2,
    nameKey: 'talent.hunter.huntersMark',
    descriptionKey: 'talent.hunter.huntersMark.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.hunter.deadeye',
    classId: 'hunter',
    tier: 3,
    nameKey: 'talent.hunter.deadeye',
    descriptionKey: 'talent.hunter.deadeye.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.hunter.volleyMaster',
    classId: 'hunter',
    tier: 3,
    nameKey: 'talent.hunter.volleyMaster',
    descriptionKey: 'talent.hunter.volleyMaster.desc',
    effect: { kind: 'signature' },
  },
];

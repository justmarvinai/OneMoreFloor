import type { TalentDef } from './types.ts';

/**
 * The Bard's tree — keep the song going.
 *
 * Her bar fills faster while one of her own songs is playing (Q26), so the tree
 * is built around never letting one stop: fill first, then a Crescendo worth
 * spending it on, then a capstone in each.
 */
export const bard: readonly TalentDef[] = [
  {
    id: 'talent.bard.silverTongue',
    classId: 'bard',
    tier: 0,
    nameKey: 'talent.bard.silverTongue',
    descriptionKey: 'talent.bard.silverTongue.desc',
    effect: { kind: 'stat', stat: 'luck' },
  },
  {
    id: 'talent.bard.resonance',
    classId: 'bard',
    tier: 0,
    nameKey: 'talent.bard.resonance',
    descriptionKey: 'talent.bard.resonance.desc',
    effect: { kind: 'stat', stat: 'resource' },
  },
  {
    id: 'talent.bard.poise',
    classId: 'bard',
    tier: 0,
    nameKey: 'talent.bard.poise',
    descriptionKey: 'talent.bard.poise.desc',
    effect: { kind: 'stat', stat: 'defense' },
  },
  {
    id: 'talent.bard.encore',
    classId: 'bard',
    tier: 1,
    nameKey: 'talent.bard.encore',
    descriptionKey: 'talent.bard.encore.desc',
    effect: { kind: 'resourceFill' },
  },
  {
    id: 'talent.bard.patronsPurse',
    classId: 'bard',
    tier: 1,
    nameKey: 'talent.bard.patronsPurse',
    descriptionKey: 'talent.bard.patronsPurse.desc',
    effect: { kind: 'gold' },
  },
  {
    id: 'talent.bard.balladOfVigour',
    classId: 'bard',
    tier: 1,
    nameKey: 'talent.bard.balladOfVigour',
    descriptionKey: 'talent.bard.balladOfVigour.desc',
    effect: { kind: 'regeneration' },
  },
  {
    id: 'talent.bard.risingCrescendo',
    classId: 'bard',
    tier: 2,
    nameKey: 'talent.bard.risingCrescendo',
    descriptionKey: 'talent.bard.risingCrescendo.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.bard.sharpWit',
    classId: 'bard',
    tier: 2,
    nameKey: 'talent.bard.sharpWit',
    descriptionKey: 'talent.bard.sharpWit.desc',
    effect: { kind: 'critDamage' },
  },
  {
    id: 'talent.bard.curioCollector',
    classId: 'bard',
    tier: 2,
    nameKey: 'talent.bard.curioCollector',
    descriptionKey: 'talent.bard.curioCollector.desc',
    effect: { kind: 'materials' },
  },
  {
    id: 'talent.bard.maestro',
    classId: 'bard',
    tier: 3,
    nameKey: 'talent.bard.maestro',
    descriptionKey: 'talent.bard.maestro.desc',
    effect: { kind: 'signature' },
  },
  {
    id: 'talent.bard.everlastingSong',
    classId: 'bard',
    tier: 3,
    nameKey: 'talent.bard.everlastingSong',
    descriptionKey: 'talent.bard.everlastingSong.desc',
    effect: { kind: 'resourceFill' },
  },
];

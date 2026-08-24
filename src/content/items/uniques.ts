/**
 * Named uniques (Q45) — the pieces that carry rules rather than numbers.
 *
 * Everything else in the game is "+N to a stat", which is why two heroes at the
 * same Power Level play identically. A unique is the answer: five of them, each
 * changing *how* a fight goes rather than how big the numbers in it are, and
 * each on a slot no class competes for so any hero can find any of them.
 *
 * Three rules hold them honest:
 *
 *  - They come through the same generator as everything else, so §13's bracket
 *    binds them exactly as it binds a rusty helm.
 *  - They do **not** promote a rarity. The summoning lobby prints rates about
 *    rarity, and a unique that turned a rare into a legendary would make those
 *    numbers false; instead a unique is simply not in the pool until the roll
 *    has already come up legendary or better.
 *  - Their power counts toward Power Level (`UNIQUE_POWER_LEVEL`), because a
 *    piece whose whole value is invisible to the bracket is a hole in §13.
 */
import type { StringKey } from '@/strings/index.ts';

/** The five powers. Adding a sixth is a data edit plus a case in the engine. */
export type UniquePowerId = 'swiftCharge' | 'lifesteal' | 'bulwark' | 'deadlyCrits' | 'thorns';

export const UNIQUE_POWER_IDS: readonly UniquePowerId[] = [
  'swiftCharge',
  'lifesteal',
  'bulwark',
  'deadlyCrits',
  'thorns',
];

export interface UniquePowerDef {
  id: UniquePowerId;
  nameKey: StringKey;
  /** One sentence, in the player's terms, for what it actually does. */
  descKey: StringKey;
}

export const UNIQUE_POWERS: Readonly<Record<UniquePowerId, UniquePowerDef>> = {
  swiftCharge: {
    id: 'swiftCharge',
    nameKey: 'unique.power.swiftCharge',
    descKey: 'unique.power.swiftCharge.desc',
  },
  lifesteal: {
    id: 'lifesteal',
    nameKey: 'unique.power.lifesteal',
    descKey: 'unique.power.lifesteal.desc',
  },
  bulwark: {
    id: 'bulwark',
    nameKey: 'unique.power.bulwark',
    descKey: 'unique.power.bulwark.desc',
  },
  deadlyCrits: {
    id: 'deadlyCrits',
    nameKey: 'unique.power.deadlyCrits',
    descKey: 'unique.power.deadlyCrits.desc',
  },
  thorns: {
    id: 'thorns',
    nameKey: 'unique.power.thorns',
    descKey: 'unique.power.thorns.desc',
  },
};

export function getUniquePower(id: string): UniquePowerDef | undefined {
  return UNIQUE_POWERS[id as UniquePowerId];
}

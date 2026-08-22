/**
 * Enemy effect kits (Brief §3.2).
 *
 * The brief draws one clear line here: normal floors may debuff the player, but
 * those debuffs are "noticeably weaker than boss debuffs". That gap is expressed
 * as magnitude, and the content test asserts it holds — so a future enemy cannot
 * quietly be given boss-grade teeth.
 */
import type { EffectDef } from '@/domain/combat/types.ts';

/** Ceiling for a normal floor's debuff, enforced by content validation. */
export const NORMAL_DEBUFF_MAX = 0.12;
/** Floor for a boss debuff, so bosses always bite harder than normal enemies. */
export const BOSS_DEBUFF_MIN = 0.2;

function debuff(id: string, stat: EffectDef['stat'], magnitude: number): EffectDef {
  return {
    id: `effect.${id}`,
    nameKey: `effect.${id}`,
    kind: 'statScale',
    stat,
    magnitude: -magnitude,
    duration: 'wholeFight',
    tone: 'debuff',
  };
}

function buff(id: string, stat: EffectDef['stat'], magnitude: number): EffectDef {
  return {
    id: `effect.${id}`,
    nameKey: `effect.${id}`,
    kind: 'statScale',
    stat,
    magnitude,
    duration: 'wholeFight',
    tone: 'buff',
  };
}

// --- Normal-floor debuffs: an inconvenience, never a wall --------------------
export const CHILL = debuff('chill', 'speed', 0.1);
export const GLOOM = debuff('gloom', 'luck', 0.1);
export const SAP = debuff('sap', 'strength', 0.08);
export const RUST = debuff('rust', 'defense', 0.1);

// --- Boss debuffs: heavy enough to change how the fight has to be fought -----
export const CURSE_OF_LEAD = debuff('curseOfLead', 'speed', 0.35);
export const WITHERING = debuff('withering', 'strength', 0.25);
export const SUNDERED = debuff('sundered', 'defense', 0.3);
export const HEXED = debuff('hexed', 'luck', 0.3);

// --- Boss self-buffs --------------------------------------------------------
export const STONESKIN = buff('stoneskin', 'defense', 0.3);
export const FURY = buff('fury', 'strength', 0.25);
export const QUICKENING = buff('quickening', 'speed', 0.4);

/**
 * Signature moves — the approved Q6/Q26 design in code (COMBAT.md §5).
 *
 * A unit's resource bar fills through class-specific events; when it is full,
 * the next action spends the whole bar on the move below. Pool size scales the
 * payoff, so the Class Resource stat is a real tempo-versus-burst dial rather
 * than a second Strength.
 */
import { RESOURCE_FILL, SIGNATURE } from '@/content/balance/combat.ts';
import type { ClassId } from '../character/types.ts';
import type { Combatant, EffectDef, SignatureKind } from './types.ts';
import { hasBuff } from './effects.ts';

/** Which move a class performs, given whether it is carrying a shield (Q26). */
export function signatureFor(classId: ClassId, hasShield: boolean): SignatureKind {
  switch (classId) {
    case 'warrior':
      return hasShield ? 'shieldSlam' : 'berserkStrike';
    case 'mage':
      return 'arcaneBlast';
    case 'hunter':
      return 'piercingVolley';
    case 'bard':
      return 'crescendo';
    case 'swashbuckler':
      return 'flurryAndFeint';
  }
}

/**
 * How much a bigger resource pool amplifies a signature. Normalised around a
 * reference pool so the multiplier is ~1 for an ordinary build and climbs for a
 * character who has invested in the stat.
 */
export function poolScaling(pool: number): number {
  const ratio = Math.max(0, pool) / SIGNATURE.poolReference;
  return 1 + (ratio - 1) * SIGNATURE.poolScaling;
}

export interface SignaturePlan {
  /** Damage multiplier applied to each hit, relative to an ordinary strike. */
  perHit: number;
  /** How many separate blows land — each rolls its own crit (Q26: the Volley). */
  hits: number;
  /** Fraction of the target's Defense this move ignores (the Mage's Blast). */
  defensePierce: number;
  /** Applied to the *user* after the move lands. */
  selfEffect?: EffectDef;
}

const SHIELD_GUARD: EffectDef = {
  id: 'effect.shieldGuard',
  nameKey: 'effect.shieldGuard',
  kind: 'damageReduction',
  magnitude: SIGNATURE.shieldSlamReduction,
  duration: SIGNATURE.shieldSlamRounds,
  tone: 'buff',
};

const FEINT: EffectDef = {
  id: 'effect.feint',
  nameKey: 'effect.feint',
  kind: 'dodgeNext',
  magnitude: 1,
  duration: 'wholeFight',
  tone: 'buff',
};

/** The Bard's songs rotate, so consecutive Crescendos are not the same buff. */
const SONGS: readonly EffectDef[] = [
  {
    id: 'effect.songOfFury',
    nameKey: 'effect.songOfFury',
    kind: 'statScale',
    stat: 'strength',
    magnitude: SIGNATURE.crescendoBuff,
    duration: SIGNATURE.crescendoRounds,
    tone: 'buff',
  },
  {
    id: 'effect.songOfStone',
    nameKey: 'effect.songOfStone',
    kind: 'statScale',
    stat: 'defense',
    magnitude: SIGNATURE.crescendoBuff,
    duration: SIGNATURE.crescendoRounds,
    tone: 'buff',
  },
  {
    id: 'effect.songOfWind',
    nameKey: 'effect.songOfWind',
    kind: 'statScale',
    stat: 'speed',
    magnitude: SIGNATURE.crescendoBuff,
    duration: SIGNATURE.crescendoRounds,
    tone: 'buff',
  },
];

export function songAt(index: number): EffectDef {
  return SONGS[Math.abs(index) % SONGS.length]!;
}

/** Turn a signature into the numbers the engine needs, for this unit right now. */
export function planSignature(
  kind: SignatureKind,
  unit: Combatant,
  songIndex: number,
): SignaturePlan {
  const scale = poolScaling(unit.resource.pool);

  switch (kind) {
    case 'berserkStrike':
      return { perHit: SIGNATURE.berserkStrike * scale, hits: 1, defensePierce: 0 };
    case 'shieldSlam':
      return {
        perHit: SIGNATURE.shieldSlam * scale,
        hits: 1,
        defensePierce: 0,
        selfEffect: SHIELD_GUARD,
      };
    case 'arcaneBlast':
      return {
        perHit: SIGNATURE.arcaneBlast * scale,
        hits: 1,
        defensePierce: SIGNATURE.arcaneBlastPierce,
      };
    case 'piercingVolley':
      return {
        perHit: SIGNATURE.piercingVolleyPerHit * scale,
        hits: SIGNATURE.piercingVolleyHits,
        defensePierce: 0,
      };
    case 'crescendo':
      return {
        perHit: SIGNATURE.crescendo * scale,
        hits: 1,
        defensePierce: 0,
        selfEffect: songAt(songIndex),
      };
    case 'flurryAndFeint':
      return {
        perHit: SIGNATURE.flurryPerHit * scale,
        hits: SIGNATURE.flurryHits,
        defensePierce: 0,
        selfEffect: FEINT,
      };
    case 'bossOnslaught':
      return { perHit: SIGNATURE.berserkStrike * scale * 0.8, hits: 2, defensePierce: 0.2 };
  }
}

/** Resource events a unit can gain from, named for what happened (Q26). */
export type FillEvent = 'dealtHit' | 'tookHit' | 'crit' | 'dodged' | 'doubleAttack' | 'roundEnd';

/**
 * How much of the bar an event fills, as a fraction of the pool. Returning zero
 * is the common case: each class only reacts to its own events, which is what
 * makes the five bars feel different to watch.
 */
export function fillFor(unit: Combatant, event: FillEvent): number {
  const source = unit.sourceId;

  switch (source) {
    case 'warrior':
      if (event === 'dealtHit') return RESOURCE_FILL.warriorOnDealHit;
      if (event === 'tookHit') return RESOURCE_FILL.warriorOnTakeHit;
      return 0;
    case 'mage':
      return event === 'roundEnd' ? RESOURCE_FILL.magePerRound : 0;
    case 'hunter':
      if (event === 'dealtHit') return RESOURCE_FILL.hunterOnDealHit;
      if (event === 'crit') return RESOURCE_FILL.hunterOnCrit;
      return 0;
    case 'bard':
      if (event !== 'roundEnd') return 0;
      return hasBuff(unit) ? RESOURCE_FILL.bardPerRoundBuffed : RESOURCE_FILL.bardPerRound;
    case 'swashbuckler':
      if (event === 'dodged') return RESOURCE_FILL.swashOnDodge;
      if (event === 'doubleAttack') return RESOURCE_FILL.swashOnDoubleAttack;
      // A trickle so the bar moves before the class owns any Speed gear.
      if (event === 'roundEnd') return RESOURCE_FILL.swashPerRound;
      return 0;
    default:
      // Enemies with a kit charge on a simple clock.
      return event === 'roundEnd' ? RESOURCE_FILL.enemyPerRound : 0;
  }
}

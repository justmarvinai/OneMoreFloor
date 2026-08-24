/**
 * Choreography — turning a resolved fight into a schedule of beats (COMBAT.md §7).
 *
 * The engine decides *what* happened; this decides *when the player sees it*. It
 * is deliberately a pure function: a `CombatScript` in, an ordered list of timed
 * beats out, with no DOM and no clock. That separation is what makes the fight's
 * pacing testable — "a crit holds longer than a graze", "a signature gets its
 * set-piece pause", "x8 still leaves damage numbers legible" are all assertions
 * about this list, not about pixels.
 *
 * Two events often make one beat: an `action` is the wind-up and the `hit` that
 * follows is the impact, so a strike reads as a single motion rather than two
 * disconnected flashes.
 */
import type {
  CombatScript,
  CombatantSnapshot,
  EffectDef,
  SignatureKind,
  UnitId,
} from '@/domain/combat/types.ts';
import type { HealSource } from '@/domain/combat/types.ts';

/**
 * Presentation timing, in milliseconds at x1. These are pacing, not balance:
 * they change how a fight *reads*, never how it resolves (§3.5), which is why
 * they live with the performer rather than in `content/balance/`.
 */
export const TIMING = {
  /** Both cards settle and the floor's modifiers land before the first blow. */
  fightStart: 640,
  floorEffect: 200,
  roundGap: 130,
  /** The lunge before a strike connects. */
  windUp: 190,
  /** A signature stops the fight for a moment — the beat worth waiting for. */
  signatureWindUp: 640,
  afterHit: 240,
  afterCrit: 340,
  afterDodge: 260,
  /** Health coming back reads as a smaller beat than a blow landing. */
  afterHeal: 200,
  effect: 150,
  resource: 60,
  defeat: 620,
  end: 420,
  /** How long a damage number lives at x1. */
  floatLife: 1000,
  critFloatLife: 1400,
  /**
   * The floor a damage number's life never drops below, whatever the playback
   * rate. At x8 the fight blurs past; the numbers must not (COMBAT.md §7).
   */
  minFloatLife: 340,
} as const;

/** A hit taking this much of a unit's maximum health is a *heavy* one. */
export const HEAVY_HIT_FRACTION = 0.15;

export type Step =
  | {
      kind: 'start';
      hero: CombatantSnapshot;
      enemy: CombatantSnapshot;
      /** Absent when the hero climbs alone (Q42). */
      pet?: CombatantSnapshot;
      isBoss: boolean;
    }
  | { kind: 'round'; round: number }
  | {
      kind: 'windUp';
      unit: UnitId;
      /** Whom it is aimed at — three units on the field, so it has to be said. */
      target: UnitId;
      action: 'strike' | 'doubleStrike' | 'signature';
      signature?: SignatureKind;
    }
  | {
      kind: 'hit';
      source: UnitId;
      target: UnitId;
      amount: number;
      crit: boolean;
      targetHp: number;
      /** A big chunk of the target's health — worth a vignette and a shake. */
      heavy: boolean;
    }
  | { kind: 'dodge'; unit: UnitId; source: UnitId }
  | {
      kind: 'heal';
      unit: UnitId;
      amount: number;
      unitHp: number;
      /** Which rule paid for it, so the card can name what healed. */
      source: HealSource;
    }
  | { kind: 'resource'; unit: UnitId; from: number; to: number; full: boolean }
  | { kind: 'effectOn'; unit: UnitId; effect: EffectDef }
  | { kind: 'effectOff'; unit: UnitId; effectId: string }
  | { kind: 'defeat'; unit: UnitId }
  | { kind: 'end'; winner: UnitId; rounds: number; byRoundCap: boolean };

export interface Beat {
  /** Milliseconds from the start of the fight, at x1. */
  at: number;
  step: Step;
}

/** How long a damage number should live at this playback rate (COMBAT.md §7). */
export function floatLifeFor(crit: boolean, rate: number): number {
  const base = crit ? TIMING.critFloatLife : TIMING.floatLife;
  return Math.max(TIMING.minFloatLife, base / rate);
}

/**
 * Schedule a whole fight.
 *
 * The walk is single-pass and forward-only: each event either advances the clock
 * or rides along with the beat before it, so the schedule is monotonic by
 * construction and a performer can play it with one timer.
 */
export function choreograph(script: CombatScript): Beat[] {
  const beats: Beat[] = [];
  let at = 0;
  const maxHp: Record<UnitId, number> = { hero: 1, pet: 1, enemy: 1 };

  /** False until the first round begins — see `effectApplied` below. */
  let opened = false;

  const push = (step: Step, advance: number): void => {
    beats.push({ at, step });
    at += advance;
  };

  for (const event of script.events) {
    switch (event.type) {
      case 'fightStart': {
        maxHp.hero = event.hero.maxHp;
        maxHp.enemy = event.enemy.maxHp;
        if (event.pet) maxHp.pet = event.pet.maxHp;
        push(
          {
            kind: 'start',
            hero: event.hero,
            enemy: event.enemy,
            ...(event.pet ? { pet: event.pet } : {}),
            isBoss: event.isBoss,
          },
          TIMING.fightStart,
        );
        // `fightStart.floorEffects` states the opening board; the engine *also*
        // emits an `effectApplied` for each of them, which is the event every
        // other effect in the fight arrives through. Drawing both put two of
        // every floor debuff on the card. The events win — one code path — and
        // the opening keeps its own pacing through `opened` below.
        break;
      }

      case 'roundStart':
        opened = true;
        push({ kind: 'round', round: event.round }, TIMING.roundGap);
        break;

      case 'action':
        push(
          {
            kind: 'windUp',
            unit: event.unit,
            target: event.target,
            action: event.kind,
            ...(event.signature ? { signature: event.signature } : {}),
          },
          event.kind === 'signature' ? TIMING.signatureWindUp : TIMING.windUp,
        );
        break;

      case 'hit': {
        const heavy = event.amount >= maxHp[event.target] * HEAVY_HIT_FRACTION;
        push(
          {
            kind: 'hit',
            source: event.source,
            target: event.target,
            amount: event.amount,
            crit: event.crit,
            targetHp: event.targetHp,
            heavy,
          },
          event.crit ? TIMING.afterCrit : TIMING.afterHit,
        );
        break;
      }

      case 'dodged':
        push({ kind: 'dodge', unit: event.unit, source: event.source }, TIMING.afterDodge);
        break;

      case 'resource':
        push(
          { kind: 'resource', unit: event.unit, from: event.from, to: event.to, full: event.full },
          TIMING.resource,
        );
        break;

      case 'effectApplied':
        // Before the first round these are the floor's own opening, which lands
        // at a slower beat than an effect thrown mid-fight.
        push(
          { kind: 'effectOn', unit: event.unit, effect: event.effect },
          opened ? TIMING.effect : TIMING.floorEffect,
        );
        break;

      case 'heal':
        push(
          {
            kind: 'heal',
            unit: event.unit,
            amount: event.amount,
            unitHp: event.unitHp,
            source: event.source,
          },
          TIMING.afterHeal,
        );
        break;

      case 'effectExpired':
        push({ kind: 'effectOff', unit: event.unit, effectId: event.effectId }, TIMING.effect);
        break;

      case 'defeated':
        push({ kind: 'defeat', unit: event.unit }, TIMING.defeat);
        break;

      case 'fightEnd':
        push(
          { kind: 'end', winner: event.winner, rounds: event.rounds, byRoundCap: event.byRoundCap },
          TIMING.end,
        );
        break;

      default:
        assertNever(event);
    }
  }

  return beats;
}

/** How long the whole performance runs, at the given playback rate. */
export function performanceMs(beats: Beat[], rate = 1): number {
  const last = beats[beats.length - 1];
  return last ? (last.at + TIMING.end) / rate : 0;
}

/** A compile-time guarantee that every event kind has a beat. */
function assertNever(event: never): never {
  throw new Error(`[choreography] unhandled combat event: ${JSON.stringify(event)}`);
}

/**
 * The combat engine (COMBAT.md §1–§6).
 *
 * Combat is automatic (Brief §4.2): the player never acts during a fight, so the
 * whole thing is resolved here in one pass and handed to the UI as data. The
 * consequences are worth stating plainly, because they are the reason for the
 * design:
 *
 *  - **Quick-Raid is free** (Brief §3.4): skipping performs nothing and applies
 *    the same result, because the result was never a product of the animation.
 *  - **Battle Speed cannot cheat** (Brief §3.5): x8 is a playback rate over an
 *    outcome that was already decided.
 *  - **A fight is reproducible**: the same seed always produces the same script,
 *    which is what makes bug reports and the balance simulator possible.
 */
import {
  CRIT,
  DAMAGE_VARIANCE,
  DEFENSE_K,
  ROUND_CAP,
  SPEED,
  STRIKE_STRENGTH_COEFFICIENT,
} from '@/content/balance/combat.ts';
import { bandRelative, diminishing, evaluate } from '@/content/balance/curves.ts';
import { createRng } from '@/app/rng.ts';
import {
  applyEffect,
  consumeDodge,
  damageReduction,
  effectiveStats,
  tickEffects,
} from './effects.ts';
import { fillFor, planSignature, type FillEvent } from './signature.ts';
import type {
  Combatant,
  CombatEvent,
  CombatOutcome,
  CombatScript,
  CombatantSnapshot,
  EffectDef,
  UnitId,
} from './types.ts';

export interface ResolveInput {
  hero: Combatant;
  enemy: Combatant;
  floor: number;
  isBoss: boolean;
  /** Modifiers the floor imposes before the first blow (Brief §3.2). */
  floorEffects?: Array<{ unit: UnitId; effect: EffectDef }>;
  seed: string;
}

function snapshot(unit: Combatant): CombatantSnapshot {
  return {
    id: unit.id,
    nameKey: unit.nameKey,
    sourceId: String(unit.sourceId),
    avatar: unit.avatar,
    stats: { ...unit.baseStats },
    maxHp: unit.maxHp,
    resourcePool: unit.resource.pool,
    resourceKind: unit.resource.kind,
    signature: unit.signature,
  };
}

/** Band references grow with depth, so percentages stay in tuned windows. */
function bandOf(floor: number): {
  defenseK: number;
  critReference: number;
  speedReference: number;
} {
  return {
    defenseK: evaluate({ kind: 'exponential', ...DEFENSE_K }, floor),
    critReference: evaluate({ kind: 'exponential', ...CRIT.reference }, floor),
    speedReference: evaluate({ kind: 'exponential', ...SPEED.reference }, floor),
  };
}

export function critChance(luck: number, floor: number): number {
  return bandRelative(luck, bandOf(floor).critReference, CRIT.cap);
}

export function doubleAttackChance(speed: number, floor: number): number {
  return bandRelative(speed, bandOf(floor).speedReference, SPEED.cap);
}

/**
 * Resolve a whole fight.
 *
 * The loop is deliberately flat and readable: rounds, each unit acts, effects
 * tick. Anything clever here would be paid for every time someone has to work
 * out why a fight went the way it did.
 */
export function resolveCombat(input: ResolveInput): CombatScript {
  const { floor, isBoss, seed } = input;
  const rng = createRng(seed);
  const band = bandOf(floor);

  // Work on copies: the engine must never mutate the character it was handed.
  const hero: Combatant = cloneCombatant(input.hero);
  const enemy: Combatant = cloneCombatant(input.enemy);

  const events: CombatEvent[] = [];
  const floorEffects = input.floorEffects ?? [];

  events.push({
    type: 'fightStart',
    floor,
    isBoss,
    hero: snapshot(hero),
    enemy: snapshot(enemy),
    floorEffects,
  });

  // Boss floors debuff the player and buff the enemy before anyone swings
  // (Brief §3.2); normal floors may carry weaker versions of the same thing.
  for (const { unit, effect } of floorEffects) {
    applyEffect(unit === 'hero' ? hero : enemy, effect);
    events.push({ type: 'effectApplied', unit, effect });
  }

  let round = 0;
  let songIndex = 0;
  let byRoundCap = false;

  while (hero.hp > 0 && enemy.hp > 0) {
    round += 1;
    if (round > ROUND_CAP) {
      byRoundCap = true;
      round -= 1;
      break;
    }
    events.push({ type: 'roundStart', round });

    // The hero acts first; Speed can buy them a second strike before the enemy
    // moves at all (Brief §4.2/§6).
    takeTurn(hero, enemy);
    if (enemy.hp > 0) takeTurn(enemy, hero);

    for (const unit of [hero, enemy]) {
      gainResource(unit, 'roundEnd');
      for (const effectId of tickEffects(unit)) {
        events.push({ type: 'effectExpired', unit: unit.id, effectId });
      }
    }
  }

  const outcome = decideOutcome(hero, enemy, round, byRoundCap, isBoss);
  if (!byRoundCap) {
    events.push({ type: 'defeated', unit: outcome.winner === 'hero' ? 'enemy' : 'hero' });
  }
  events.push({ type: 'fightEnd', winner: outcome.winner, rounds: round, byRoundCap });

  return { seed, floor, isBoss, events, outcome };

  // --- helpers, closed over the fight's state -------------------------------

  function gainResource(unit: Combatant, event: FillEvent): void {
    const fraction = fillFor(unit, event);
    if (fraction <= 0 || unit.resource.pool <= 0) return;

    const from = unit.resource.current;
    const to = Math.min(unit.resource.pool, from + fraction * unit.resource.pool);
    if (to === from) return;

    unit.resource.current = to;
    events.push({
      type: 'resource',
      unit: unit.id,
      from,
      to,
      full: to >= unit.resource.pool,
    });
  }

  function takeTurn(actor: Combatant, target: Combatant): void {
    if (actor.hp <= 0 || target.hp <= 0) return;

    // A full bar spends itself on the signature instead of an ordinary strike.
    if (
      actor.signature &&
      actor.resource.pool > 0 &&
      actor.resource.current >= actor.resource.pool
    ) {
      performSignature(actor, target);
      return;
    }

    events.push({ type: 'action', unit: actor.id, kind: 'strike' });
    strike(actor, target, { multiplier: 1, defensePierce: 0 });
    if (target.hp <= 0) return;

    const stats = effectiveStats(actor);
    if (rng.chance(bandRelative(stats.speed, band.speedReference, SPEED.cap))) {
      // The double attack lands before the defender has acted at all (§4.2).
      events.push({ type: 'action', unit: actor.id, kind: 'doubleStrike' });
      gainResource(actor, 'doubleAttack');
      strike(actor, target, { multiplier: 1, defensePierce: 0 });
    }
  }

  function performSignature(actor: Combatant, target: Combatant): void {
    const kind = actor.signature!;
    const plan = planSignature(kind, actor, songIndex);
    if (kind === 'crescendo') songIndex += 1;

    events.push({ type: 'action', unit: actor.id, kind: 'signature', signature: kind });

    const from = actor.resource.current;
    actor.resource.current = 0;
    events.push({ type: 'resource', unit: actor.id, from, to: 0, full: false });

    for (let hit = 0; hit < plan.hits && target.hp > 0; hit += 1) {
      strike(actor, target, { multiplier: plan.perHit, defensePierce: plan.defensePierce });
    }

    if (plan.selfEffect) {
      applyEffect(actor, plan.selfEffect);
      events.push({ type: 'effectApplied', unit: actor.id, effect: plan.selfEffect });
    }
  }

  function strike(
    actor: Combatant,
    target: Combatant,
    options: { multiplier: number; defensePierce: number },
  ): void {
    // A pending feint eats the blow outright (Q26, the Swashbuckler's aftermath).
    if (consumeDodge(target)) {
      events.push({ type: 'dodged', unit: target.id, source: actor.id });
      gainResource(target, 'dodged');
      return;
    }

    const attacker = effectiveStats(actor);
    const defender = effectiveStats(target);

    const crit = rng.chance(bandRelative(attacker.luck, band.critReference, CRIT.cap));
    const raw =
      attacker.strength *
      STRIKE_STRENGTH_COEFFICIENT *
      options.multiplier *
      rng.range(DAMAGE_VARIANCE.min, DAMAGE_VARIANCE.max) *
      (crit ? CRIT.multiplier : 1);

    const effectiveDefense = defender.defense * (1 - options.defensePierce);
    const mitigated = raw * diminishing(effectiveDefense, band.defenseK);
    const guarded = mitigated * (1 - damageReduction(target));

    // Every blow does something: a hit that rounds to zero reads as a bug.
    const amount = Math.max(1, Math.round(guarded));
    target.hp = Math.max(0, target.hp - amount);

    events.push({
      type: 'hit',
      source: actor.id,
      target: target.id,
      amount,
      crit,
      targetHp: target.hp,
    });

    gainResource(actor, 'dealtHit');
    if (crit) gainResource(actor, 'crit');
    if (target.hp > 0) gainResource(target, 'tookHit');
  }
}

function cloneCombatant(unit: Combatant): Combatant {
  return {
    ...unit,
    baseStats: { ...unit.baseStats },
    resource: { ...unit.resource },
    effects: unit.effects.map((effect) => ({ ...effect })),
  };
}

function decideOutcome(
  hero: Combatant,
  enemy: Combatant,
  rounds: number,
  byRoundCap: boolean,
  isBoss: boolean,
): CombatOutcome {
  let winner: UnitId;

  if (!byRoundCap) {
    winner = hero.hp > 0 ? 'hero' : 'enemy';
  } else {
    // A fight neither side can finish goes to whoever is in better shape; an
    // exact tie favours the hero on a normal floor and the boss on a boss floor
    // (COMBAT.md §3). This should effectively never fire.
    const heroShare = hero.maxHp > 0 ? hero.hp / hero.maxHp : 0;
    const enemyShare = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    if (heroShare === enemyShare) winner = isBoss ? 'enemy' : 'hero';
    else winner = heroShare > enemyShare ? 'hero' : 'enemy';
  }

  return {
    winner,
    heroSurvived: winner === 'hero',
    rounds,
    heroHpRemaining: hero.hp,
    byRoundCap,
  };
}

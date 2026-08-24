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
  ROUND_CAP,
  SPEED,
  STRIKE_STRENGTH_COEFFICIENT,
} from '@/content/balance/combat.ts';
import { UNIQUE_MAGNITUDE } from '@/content/balance/uniques.ts';
import type { UniquePowerId } from '@/content/items/uniques.ts';
import { bandRelative, diminishing } from '@/content/balance/curves.ts';
import { createRng } from '@/app/rng.ts';
import { bandOf } from './bands.ts';
import {
  applyEffect,
  consumeDodge,
  damageReduction,
  effectiveStats,
  tickEffects,
} from './effects.ts';
import { fillFor, planSignature, type FillEvent } from './signature.ts';
import type {
  CombatTalents,
  Combatant,
  CombatEvent,
  CombatOutcome,
  CombatScript,
  CombatantSnapshot,
  EffectDef,
  HealSource,
  UnitId,
} from './types.ts';

/** The companion at the hero's side, and everything the engine needs of it (Q42). */
export interface ResolvePet {
  unit: Combatant;
  /** Applied to the hero at the bell, for the whole fight. */
  aura: EffectDef;
  /** Share of the enemy's attacks it pulls onto itself. */
  taunt: number;
}

export interface ResolveInput {
  hero: Combatant;
  enemy: Combatant;
  /** Absent when the hero climbs alone, which is most of the early game. */
  pet?: ResolvePet;
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
  const pet: Combatant | null = input.pet ? cloneCombatant(input.pet.unit) : null;
  const taunt = input.pet ? Math.max(0, Math.min(1, input.pet.taunt)) : 0;

  const events: CombatEvent[] = [];
  const floorEffects = input.floorEffects ?? [];

  events.push({
    type: 'fightStart',
    floor,
    isBoss,
    hero: snapshot(hero),
    enemy: snapshot(enemy),
    ...(pet ? { pet: snapshot(pet) } : {}),
    floorEffects,
  });

  // Boss floors debuff the player and buff the enemy before anyone swings
  // (Brief §3.2); normal floors may carry weaker versions of the same thing.
  for (const { unit, effect } of floorEffects) {
    applyEffect(unitById(unit), effect);
    events.push({ type: 'effectApplied', unit, effect });
  }

  // The companion's aura lands after the floor's own modifiers, and on the hero
  // rather than on the companion: what a pet gives is given to whoever it walks
  // beside (Q42). Kept out of `floorEffects` deliberately — the preview and the
  // banner read that list as *the floor's* doing, and it is not.
  if (pet && input.pet) {
    applyEffect(hero, input.pet.aura);
    events.push({ type: 'effectApplied', unit: 'hero', effect: input.pet.aura });
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
    // moves at all (Brief §4.2/§6). The companion follows, then the enemy —
    // so a fight with a pet in it is the same fight with one extra blow, rather
    // than a different order of the same ones.
    takeTurn(hero, enemy);
    if (pet && pet.hp > 0 && enemy.hp > 0) takeTurn(pet, enemy);
    if (enemy.hp > 0) takeTurn(enemy, enemyTarget());

    for (const unit of pet ? [hero, pet, enemy] : [hero, enemy]) {
      gainResource(unit, 'roundEnd');
      // Regeneration closes wounds between exchanges rather than during one, so
      // it can never save a unit from the blow that killed it (Q38).
      heal(unit, unit.maxHp * talent(unit, 'regeneration'), 'regeneration');
      for (const effectId of tickEffects(unit)) {
        events.push({ type: 'effectExpired', unit: unit.id, effectId });
      }
    }
  }

  const outcome = decideOutcome(hero, enemy, round, byRoundCap, isBoss);
  // The companion's fate is never the fight's: a hero standing over a fallen pet
  // has cleared the floor, and the pet is back on its feet for the next one.
  if (pet) outcome.petSurvived = pet.hp > 0;
  if (!byRoundCap) {
    events.push({ type: 'defeated', unit: outcome.winner === 'hero' ? 'enemy' : 'hero' });
  }
  events.push({ type: 'fightEnd', winner: outcome.winner, rounds: round, byRoundCap });

  return { seed, floor, isBoss, events, outcome };

  // --- helpers, closed over the fight's state -------------------------------

  /**
   * What a unique power is worth to this unit, or zero when they do not have it
   * (Q45).
   *
   * One lookup for all five rules, so adding a sixth is a case in `UNIQUE_MAGNITUDE`
   * and one call site rather than a new branch threaded through the whole engine.
   */
  /** Look a unit up by the id an event carries. */
  function unitById(id: UnitId): Combatant {
    if (id === 'enemy') return enemy;
    if (id === 'pet' && pet) return pet;
    return hero;
  }

  /**
   * Whom the enemy swings at.
   *
   * A companion draws a share of what comes in, which is the whole reason to
   * field a guardian over a striker. A downed one draws nothing — the enemy has
   * no reason to keep hitting something already on the floor.
   */
  function enemyTarget(): Combatant {
    if (pet && pet.hp > 0 && rng.chance(taunt)) return pet;
    return hero;
  }

  function power(unit: Combatant, id: UniquePowerId): number {
    return unit.powers?.includes(id) === true ? UNIQUE_MAGNITUDE[id] : 0;
  }

  /**
   * What a unit's talent tree is worth on one lever, or zero when it has none
   * (Q38).
   *
   * Same shape as `power` above and for the same reason: the engine reads a
   * number, never a character. Enemies simply have no bundle, so every call here
   * is a zero for them without a single branch saying so.
   */
  function talent(unit: Combatant, lever: keyof CombatTalents): number {
    return unit.talents?.[lever] ?? 0;
  }

  function gainResource(unit: Combatant, event: FillEvent): void {
    // Quickening: the bar fills faster, which is the only thing in the game that
    // changes how *often* a signature happens rather than how hard it hits.
    const fraction =
      fillFor(unit, event) * (1 + power(unit, 'swiftCharge') + talent(unit, 'resourceFill'));
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

    events.push({ type: 'action', unit: actor.id, target: target.id, kind: 'strike' });
    strike(actor, target, { multiplier: 1, defensePierce: 0 });
    if (target.hp <= 0) return;

    const stats = effectiveStats(actor);
    if (rng.chance(bandRelative(stats.speed, band.speedReference, SPEED.cap))) {
      // The double attack lands before the defender has acted at all (§4.2).
      events.push({ type: 'action', unit: actor.id, target: target.id, kind: 'doubleStrike' });
      gainResource(actor, 'doubleAttack');
      strike(actor, target, { multiplier: 1, defensePierce: 0 });
    }
  }

  function performSignature(actor: Combatant, target: Combatant): void {
    const kind = actor.signature!;
    const base = planSignature(kind, actor, songIndex);
    // Talents scale what the bar buys, not how often it fills — that lever is
    // `resourceFill`, and keeping the two apart is what lets a build choose
    // between more signatures and bigger ones (Q38).
    const plan = { ...base, perHit: base.perHit * (1 + talent(actor, 'signature')) };
    if (kind === 'crescendo') songIndex += 1;

    events.push({
      type: 'action',
      unit: actor.id,
      target: target.id,
      kind: 'signature',
      signature: kind,
    });

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
    // Spirekeen: a bigger crit rather than a more frequent one, so it rewards
    // Luck the hero already has instead of replacing the need for it.
    const critMultiplier =
      CRIT.multiplier * (1 + power(actor, 'deadlyCrits') + talent(actor, 'critDamage'));
    const raw =
      attacker.strength *
      STRIKE_STRENGTH_COEFFICIENT *
      options.multiplier *
      rng.range(DAMAGE_VARIANCE.min, DAMAGE_VARIANCE.max) *
      (crit ? critMultiplier : 1);

    const effectiveDefense = defender.defense * (1 - options.defensePierce);
    const mitigated = raw * diminishing(effectiveDefense, band.defenseK);
    // Stoneward is a flat share off everything, stacking with the effect-based
    // reductions rather than replacing them.
    const guarded =
      mitigated *
      (1 - damageReduction(target)) *
      (1 - power(target, 'bulwark')) *
      (1 - talent(target, 'damageReduction'));

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

    if (target.hp <= 0 && target.id === 'pet') {
      events.push({ type: 'defeated', unit: 'pet' });
    }

    gainResource(actor, 'dealtHit');
    if (crit) gainResource(actor, 'crit');
    if (target.hp > 0) gainResource(target, 'tookHit');

    // Emberdrinker heals the striker; Bramblehide answers back. Both are
    // resolved from the blow that actually landed, so a dodged or mitigated hit
    // pays exactly what it was worth.
    heal(actor, amount * power(actor, 'lifesteal'), 'lifesteal');
    reflect(target, actor, amount * power(target, 'thorns'));
  }

  /** Return health to a unit, capped at its pool and never below one point. */
  function heal(unit: Combatant, amount: number, source: HealSource): void {
    if (amount <= 0 || unit.hp <= 0 || unit.hp >= unit.maxHp) return;

    const given = Math.max(1, Math.round(amount));
    const before = unit.hp;
    unit.hp = Math.min(unit.maxHp, unit.hp + given);
    if (unit.hp === before) return;

    events.push({ type: 'heal', unit: unit.id, amount: unit.hp - before, unitHp: unit.hp, source });
  }

  /**
   * Damage sent back to whoever dealt it.
   *
   * Written as its own step rather than a recursive `strike`, deliberately: two
   * units both wearing Bramblehide would otherwise reflect at each other until
   * the stack ran out.
   */
  function reflect(from: Combatant, to: Combatant, amount: number): void {
    if (amount <= 0 || from.hp <= 0 || to.hp <= 0) return;

    const sent = Math.max(1, Math.round(amount));
    to.hp = Math.max(0, to.hp - sent);
    events.push({
      type: 'hit',
      source: from.id,
      target: to.id,
      amount: sent,
      crit: false,
      targetHp: to.hp,
    });
    if (to.hp <= 0) events.push({ type: 'defeated', unit: to.id });
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

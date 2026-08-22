/**
 * Buffs and debuffs (Brief §3.2, COMBAT.md §4).
 *
 * One generic model serves floor modifiers, boss kits and signature moves alike.
 * The engine knows only this shape; what a particular boss *does* is content, so
 * adding a nastier boss never means touching the engine (Brief §2.3).
 */
import type { StatBlock, StatId } from '../stats.ts';
import type { ActiveEffect, Combatant, EffectDef } from './types.ts';

export function activate(def: EffectDef): ActiveEffect {
  return {
    def,
    remainingRounds: def.duration === 'wholeFight' ? Number.POSITIVE_INFINITY : def.duration,
  };
}

export function applyEffect(unit: Combatant, def: EffectDef): void {
  // Re-applying an effect refreshes it rather than stacking: two Shield Slams
  // in a row should extend the guard, not double it into something unreadable.
  const existing = unit.effects.find((effect) => effect.def.id === def.id);
  if (existing) {
    existing.remainingRounds = activate(def).remainingRounds;
    return;
  }
  unit.effects.push(activate(def));
}

/** Tick durations down. Returns the ids of effects that just expired. */
export function tickEffects(unit: Combatant): string[] {
  const expired: string[] = [];
  unit.effects = unit.effects.filter((effect) => {
    if (effect.remainingRounds === Number.POSITIVE_INFINITY) return true;
    effect.remainingRounds -= 1;
    if (effect.remainingRounds > 0) return true;
    expired.push(effect.def.id);
    return false;
  });
  return expired;
}

/** The unit's stats with every active `statScale` applied. */
export function effectiveStats(unit: Combatant): StatBlock {
  const stats = { ...unit.baseStats };
  for (const { def } of unit.effects) {
    if (def.kind !== 'statScale' || !def.stat) continue;
    stats[def.stat] = Math.max(0, Math.round(stats[def.stat] * (1 + def.magnitude)));
  }
  return stats;
}

export function effectiveStat(unit: Combatant, stat: StatId): number {
  return effectiveStats(unit)[stat];
}

/** Combined damage reduction from every active guard, capped below immunity. */
export function damageReduction(unit: Combatant): number {
  let remaining = 1;
  for (const { def } of unit.effects) {
    if (def.kind === 'damageReduction') remaining *= 1 - def.magnitude;
  }
  // Multiplicative stacking approaches zero without reaching it — nothing in
  // the game may make a unit untouchable (COMBAT.md §2).
  return 1 - remaining;
}

/**
 * Consume a pending auto-dodge, if the unit has one. Returns true when the
 * incoming attack should miss (the Swashbuckler's feint, Q26).
 */
export function consumeDodge(unit: Combatant): boolean {
  const index = unit.effects.findIndex((effect) => effect.def.kind === 'dodgeNext');
  if (index === -1) return false;
  unit.effects.splice(index, 1);
  return true;
}

export function hasBuff(unit: Combatant): boolean {
  return unit.effects.some((effect) => effect.def.tone === 'buff');
}

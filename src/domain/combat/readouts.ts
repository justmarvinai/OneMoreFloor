/**
 * What a stat actually does, in the numbers a player can read (Brief §6).
 *
 * The character screen has to answer "what does another point of Defense buy
 * me?" without the player running an experiment. These derive from exactly the
 * config the engine uses, so the screen can never quietly disagree with the
 * fight — the two read the same table or the build breaks.
 */
import { diminishing, bandRelative } from '@/content/balance/curves.ts';
import { CRIT, SPEED, STRIKE_STRENGTH_COEFFICIENT } from '@/content/balance/combat.ts';
import type { StatBlock } from '../stats.ts';
import { bandOf } from './bands.ts';

export interface StatReadouts {
  /** Damage one ordinary strike lands before variance and the enemy's defence. */
  damagePerStrike: number;
  /** Fraction of incoming damage this Defense turns away, 0–1. */
  mitigation: number;
  /** Chance a strike crits, 0–1. */
  critChance: number;
  /** Chance of striking twice before the enemy acts, 0–1 (§6, gear-only). */
  doubleAttackChance: number;
  /** Signature pool: how much has to charge before the class move fires. */
  resourcePool: number;
  maxHp: number;
}

/**
 * `floor` matters because crit, speed and mitigation are all relative to the
 * depth being fought (BALANCE.md §4) — the same 300 Luck is a lot on floor 12
 * and very little on floor 1200.
 */
export function statReadouts(stats: StatBlock, floor: number): StatReadouts {
  const band = bandOf(Math.max(1, floor));
  return {
    damagePerStrike: Math.round(stats.strength * STRIKE_STRENGTH_COEFFICIENT),
    mitigation: 1 - diminishing(stats.defense, band.defenseK),
    critChance: bandRelative(stats.luck, band.critReference, CRIT.cap),
    doubleAttackChance: bandRelative(stats.speed, band.speedReference, SPEED.cap),
    resourcePool: stats.resource,
    maxHp: stats.hp,
  };
}

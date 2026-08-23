/**
 * The shape of an enemy definition.
 *
 * An enemy is a *profile*, not a stat block: multipliers over the floor curve,
 * so one definition stays a meaningful fight from floor 3 to floor 3000 (Brief
 * §3.7). Its avatar binds by id with FantasyUI's silhouette as the fallback, so
 * dropping in real art later is a one-line data change (Brief §4.3).
 */
import type { EffectDef } from '@/domain/combat/types.ts';
import type { StatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

/**
 * Thematic families.
 *
 * A family is not decoration: a floor band names the families that live in it and
 * the generator draws only from those, so this list is what makes one stretch of
 * the tower feel different from the next (CONTENT_PIPELINE §2).
 */
export type EnemyFamily =
  'vermin' | 'brigand' | 'beast' | 'construct' | 'arcane' | 'undead' | 'infernal' | 'aberration';

export interface EnemyDef {
  id: string;
  nameKey: StringKey;
  family: EnemyFamily;
  /**
   * Avatar asset id. Every enemy uses FantasyUI's `silhouette-warrior-m` until
   * real art arrives (Brief §4.3) — swapping it is this one field.
   */
  avatar: string;
  /** Multipliers over the floor's base stats. 1 is average for its depth. */
  profile: Partial<Record<StatId, number>>;
  /**
   * What this enemy inflicts on the player at fight start. Normal-floor debuffs
   * are "noticeably weaker than boss debuffs" (Brief §3.2), which is a magnitude
   * decision made here in content.
   */
  playerDebuff?: EffectDef;
  /** Floors this enemy appears on, as `[min, max]`. */
  floors: [number, number];
  /** Relative likelihood within its band. */
  weight: number;
}

export interface BossDef extends EnemyDef {
  /** Bosses buff themselves as well as debuffing the player (Brief §3.2). */
  selfBuff?: EffectDef;
  /** Bosses charge a signature of their own (COMBAT.md §5). */
  hasSignature: true;
}

/**
 * Combat vocabulary and the engine → UI contract (COMBAT.md §6).
 *
 * A fight is **resolved to data first and performed later**: the engine returns
 * the whole fight as an ordered list of events, and the combat screen is a dumb
 * interpreter of that list. That one decision buys Quick-Raid (perform nothing,
 * apply the result), Battle Speed (playback rate, never outcome), replayable bug
 * reports, and a balance simulator that runs the real engine at full speed.
 */
import type { ClassId, ResourceKind } from '../character/types.ts';
import type { StatBlock, StatId } from '../stats.ts';

export type UnitId = 'hero' | 'enemy';

/** Which signature move a unit performs when its bar fills (Q26). */
export type SignatureKind =
  | 'berserkStrike'
  | 'shieldSlam'
  | 'arcaneBlast'
  | 'piercingVolley'
  | 'crescendo'
  | 'flurryAndFeint'
  /** Bosses hit hard on a simple clock rather than carrying a class identity. */
  | 'bossOnslaught';

/** How an effect changes the unit carrying it. */
export type EffectKind =
  /** Scales one stat by `magnitude` (0.25 = +25%, -0.25 = −25%). */
  | 'statScale'
  /** Reduces incoming damage by `magnitude`. */
  | 'damageReduction'
  /** The next attack against this unit misses entirely. */
  | 'dodgeNext';

export interface EffectDef {
  id: string;
  nameKey: string;
  kind: EffectKind;
  /** Which stat `statScale` applies to. */
  stat?: StatId;
  magnitude: number;
  /** Rounds it lasts, or the whole fight for floor modifiers (Brief §3.2). */
  duration: number | 'wholeFight';
  /** Whether it helps or hurts, for the UI's chip colouring. */
  tone: 'buff' | 'debuff';
}

export interface ActiveEffect {
  def: EffectDef;
  remainingRounds: number;
}

export interface CombatantResource {
  kind: ResourceKind;
  current: number;
  pool: number;
}

/** A unit as the engine tracks it through a fight. */
export interface Combatant {
  id: UnitId;
  nameKey: string;
  /** Class for the hero, enemy definition id otherwise — for the UI's art. */
  sourceId: ClassId | string;
  /** Avatar asset id (Brief §4.3, with the silhouette fallback). */
  avatar: string;
  baseStats: StatBlock;
  hp: number;
  maxHp: number;
  resource: CombatantResource;
  signature: SignatureKind | null;
  effects: ActiveEffect[];
}

/** A snapshot for the script's opening event, so a replay needs nothing else. */
export interface CombatantSnapshot {
  id: UnitId;
  nameKey: string;
  sourceId: string;
  avatar: string;
  stats: StatBlock;
  maxHp: number;
  resourcePool: number;
  resourceKind: ResourceKind;
  signature: SignatureKind | null;
}

export type CombatEvent =
  | {
      type: 'fightStart';
      floor: number;
      isBoss: boolean;
      hero: CombatantSnapshot;
      enemy: CombatantSnapshot;
      /** Floor modifiers applied before the first blow (Brief §3.2). */
      floorEffects: Array<{ unit: UnitId; effect: EffectDef }>;
    }
  | { type: 'roundStart'; round: number }
  | {
      type: 'action';
      unit: UnitId;
      kind: 'strike' | 'doubleStrike' | 'signature';
      signature?: SignatureKind;
    }
  | {
      type: 'hit';
      source: UnitId;
      target: UnitId;
      amount: number;
      crit: boolean;
      /** Target's health after the blow, so the performer never recomputes. */
      targetHp: number;
    }
  | { type: 'dodged'; unit: UnitId; source: UnitId }
  | { type: 'resource'; unit: UnitId; from: number; to: number; full: boolean }
  | { type: 'effectApplied'; unit: UnitId; effect: EffectDef }
  | { type: 'effectExpired'; unit: UnitId; effectId: string }
  | { type: 'defeated'; unit: UnitId }
  | {
      type: 'fightEnd';
      winner: UnitId;
      rounds: number;
      /** True when the round cap ended it rather than a death (COMBAT.md §3). */
      byRoundCap: boolean;
    };

/**
 * A whole fight as data. Serializable by construction: a bug report can carry
 * one and it replays exactly (ARCHITECTURE §5).
 */
export interface CombatScript {
  seed: string;
  floor: number;
  isBoss: boolean;
  events: CombatEvent[];
  outcome: CombatOutcome;
}

export interface CombatOutcome {
  winner: UnitId;
  heroSurvived: boolean;
  rounds: number;
  heroHpRemaining: number;
  byRoundCap: boolean;
}

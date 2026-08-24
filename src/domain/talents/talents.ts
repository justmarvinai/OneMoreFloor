/**
 * Talents (Q38) — the hero's own build.
 *
 * A level-up used to be a number going up. This is the version where it is a
 * question: one point, eleven answers, and a tree deep enough that no hero fills
 * it quickly. Everything is per-character and dies with the character, which is
 * what makes the *account's* echoes a different kind of reward (Q36).
 *
 * Two rules keep the tree honest with the rest of the game:
 *
 *  - **Nothing here raises Speed.** The effect type is built on
 *    `UpgradableStatId`, which cannot express it (Brief §6).
 *  - **Every point is visible to the bracket.** Stat talents reach it through
 *    the hero's stat total; the rest are counted explicitly, because a hero who
 *    spent sixty points on rules the bracket cannot see would draw drops sized
 *    for someone far weaker (Brief §13).
 */
import { evaluate } from '@/content/balance/curves.ts';
import {
  POWER_PER_TALENT_POINT,
  TALENT_CAP,
  TALENT_MAGNITUDE,
  TALENT_MAX_RANK,
  TALENT_POINTS_PER_LEVEL,
  TALENT_RANK_COST,
  TALENT_RESPEC_COST,
  TALENT_TIER_UNLOCK,
} from '@/content/balance/talents.ts';
import { getTalent, talentsFor, type TalentDef } from '@/content/talents/index.ts';
import type { Character, ClassId } from '../character/types.ts';
import {
  emptyStatBlock,
  UPGRADABLE_STAT_IDS,
  type StatBlock,
  type UpgradableStatId,
} from '../stats.ts';

export type { TalentDef };
export { TALENT_MAX_RANK };

/** What the character's stored talents actually mean, cleaned up. */
type Learned = ReadonlyArray<{ def: TalentDef; rank: number }>;

/** The subset of a character talents care about, so tests need no whole hero. */
export interface TalentedCharacter {
  identity: Pick<Character['identity'], 'classId'>;
  progression: Pick<Character['progression'], 'level'>;
  talents: Character['talents'];
}

/**
 * Read the stored map into definitions, dropping anything that does not belong.
 *
 * A save written by a future build, hand-edited, or carried across a class
 * change could hold an unknown id, another class's talent, or a rank above the
 * ceiling. None of those are errors worth stopping the game for — they are
 * simply not talents this hero has, and every function below is built on this
 * one so none of them has to remember that.
 */
function learned(character: TalentedCharacter): Learned {
  const classId = character.identity.classId;
  const out: Array<{ def: TalentDef; rank: number }> = [];

  for (const def of talentsFor(classId)) {
    const stored = character.talents[def.id];
    const rank = Math.max(0, Math.min(TALENT_MAX_RANK, Math.floor(stored ?? 0)));
    if (rank > 0) out.push({ def, rank });
  }
  return out;
}

/** What one rank in a tier costs. */
export function rankCost(tier: number): number {
  return TALENT_RANK_COST[Math.max(0, tier)] ?? TALENT_RANK_COST.at(-1) ?? 1;
}

/** Points earned so far: one per level (Q38). */
export function pointsEarned(character: TalentedCharacter): number {
  return Math.max(0, Math.floor(character.progression.level)) * TALENT_POINTS_PER_LEVEL;
}

/** Points already committed, in the currency ranks are bought with. */
export function pointsSpent(character: TalentedCharacter): number {
  return learned(character).reduce((total, { def, rank }) => total + rank * rankCost(def.tier), 0);
}

export function pointsAvailable(character: TalentedCharacter): number {
  return Math.max(0, pointsEarned(character) - pointsSpent(character));
}

/** Ranks held in one talent. */
export function rankOf(character: TalentedCharacter, id: string): number {
  return learned(character).find(({ def }) => def.id === id)?.rank ?? 0;
}

/** Points that must be spent in the tree before a tier opens. */
export function tierUnlock(tier: number): number {
  return TALENT_TIER_UNLOCK[Math.max(0, tier)] ?? TALENT_TIER_UNLOCK.at(-1) ?? 0;
}

/** Everything one talent's card needs, without the screen doing arithmetic. */
export interface TalentStatus {
  def: TalentDef;
  rank: number;
  /** Null when the talent is fully learned. */
  cost: number | null;
  /** True when the tier is open and the points are in hand. */
  learnable: boolean;
  /** True when the row this talent sits in has not opened yet. */
  tierLocked: boolean;
  /** Points still needed in the tree before the row opens. */
  tierShortfall: number;
  /** What the ranks already held are worth, in the effect's own units. */
  effect: number;
  /** What one more rank would add — after any cap, so the card never lies. */
  step: number;
}

/** The whole tree, in tier order, ready to render. */
export function talentTree(character: TalentedCharacter): TalentStatus[] {
  const spent = pointsSpent(character);
  const available = pointsAvailable(character);

  return talentsFor(character.identity.classId).map((def) => {
    const rank = rankOf(character, def.id);
    const cost = rank >= TALENT_MAX_RANK ? null : rankCost(def.tier);
    const shortfall = Math.max(0, tierUnlock(def.tier) - spent);
    const effect = valueOf(def, rank);

    return {
      def,
      rank,
      cost,
      learnable: cost !== null && shortfall === 0 && available >= cost,
      tierLocked: shortfall > 0,
      tierShortfall: shortfall,
      effect,
      // The *actual* gain, not the nominal one: a rank that a cap swallows adds
      // nothing, and a card that promised otherwise would be a lie the player
      // pays points for (§20.5).
      step: cost === null ? 0 : valueOf(def, rank + 1) - effect,
    };
  });
}

export type TalentRefusal =
  'noSuchTalent' | 'wrongClass' | 'maxRank' | 'tierLocked' | 'notEnoughPoints';

/** Spend one point. The character is the only thing that changes. */
export function learnTalent(character: Character, id: string): Character | TalentRefusal {
  const def = getTalent(id);
  if (!def) return 'noSuchTalent';
  if (def.classId !== character.identity.classId) return 'wrongClass';

  const rank = rankOf(character, def.id);
  if (rank >= TALENT_MAX_RANK) return 'maxRank';
  if (pointsSpent(character) < tierUnlock(def.tier)) return 'tierLocked';

  const cost = rankCost(def.tier);
  if (pointsAvailable(character) < cost) return 'notEnoughPoints';

  return { ...character, talents: { ...character.talents, [def.id]: rank + 1 } };
}

/**
 * Gold to unlearn everything.
 *
 * Priced off points committed rather than level, so changing your mind about
 * four points costs pocket money and changing your mind about a hundred is a
 * decision. Zero when there is nothing to undo.
 */
export function respecCost(character: TalentedCharacter): number {
  const spent = pointsSpent(character);
  return spent === 0 ? 0 : Math.round(evaluate(TALENT_RESPEC_COST, spent));
}

export type RespecRefusal = 'nothingLearned' | 'notEnoughGold';

/** Unlearn the whole tree for gold, returning every point to the pool. */
export function respecTalents(character: Character): Character | RespecRefusal {
  const cost = respecCost(character);
  if (cost === 0) return 'nothingLearned';
  if (character.currencies.gold < cost) return 'notEnoughGold';

  return {
    ...character,
    currencies: { ...character.currencies, gold: character.currencies.gold - cost },
    talents: {},
  };
}

/**
 * What the tree is worth right now, in the units each caller needs.
 *
 * One object rather than nine getters, for the same reason the echo bonuses are:
 * every caller that wants one usually wants three, and threading a single value
 * through the reward roll is how a bonus quietly stops being applied.
 */
export interface TalentBonuses {
  /** Per stat, a fraction of the hero's durable total to add. Never Speed (§6). */
  stats: Record<UpgradableStatId, number>;
  /** Added to signature-move damage. */
  signature: number;
  /** Added to how fast the resource bar fills. */
  resourceFill: number;
  /** Added to the extra damage a critical hit deals. */
  critDamage: number;
  /** Share of every incoming blow turned aside. Capped. */
  damageReduction: number;
  /** Share of the hero's pool healed at the end of each round. */
  regeneration: number;
  /** Multiplier on the gold a floor pays. */
  gold: number;
  /** Multiplier on the experience a floor teaches. */
  xp: number;
  /** Multiplier on the materials a floor gives up. */
  materials: number;
}

/** The neutral set, for every caller with no character in hand. */
export const NO_TALENTS: TalentBonuses = {
  stats: { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 },
  signature: 0,
  resourceFill: 0,
  critDamage: 0,
  damageReduction: 0,
  regeneration: 0,
  gold: 1,
  xp: 1,
  materials: 1,
};

/** What `rank` ranks of one talent are worth, caps included. */
function valueOf(def: TalentDef, rank: number): number {
  const held = Math.max(0, Math.min(TALENT_MAX_RANK, rank));
  switch (def.effect.kind) {
    case 'stat':
      return held * TALENT_MAGNITUDE.statPercent;
    case 'signature':
      return held * TALENT_MAGNITUDE.signature;
    case 'resourceFill':
      return held * TALENT_MAGNITUDE.resourceFill;
    case 'critDamage':
      return held * TALENT_MAGNITUDE.critDamage;
    case 'regeneration':
      return held * TALENT_MAGNITUDE.regeneration;
    case 'gold':
      return held * TALENT_MAGNITUDE.gold;
    case 'xp':
      return held * TALENT_MAGNITUDE.xp;
    case 'materials':
      return held * TALENT_MAGNITUDE.materials;
    case 'damageReduction':
      // Capped here rather than at the sum, so a single talent's card shows the
      // truth even before the tree is read as a whole.
      return Math.min(TALENT_CAP.damageReduction, held * TALENT_MAGNITUDE.damageReduction);
  }
}

export function talentBonuses(character: TalentedCharacter | null | undefined): TalentBonuses {
  if (!character) return NO_TALENTS;

  const bonuses: TalentBonuses = {
    stats: { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 },
    signature: 0,
    resourceFill: 0,
    critDamage: 0,
    damageReduction: 0,
    regeneration: 0,
    gold: 1,
    xp: 1,
    materials: 1,
  };

  for (const { def, rank } of learned(character)) {
    const value = valueOf(def, rank);
    switch (def.effect.kind) {
      case 'stat':
        bonuses.stats[def.effect.stat] += value;
        break;
      case 'gold':
        bonuses.gold += value;
        break;
      case 'xp':
        bonuses.xp += value;
        break;
      case 'materials':
        bonuses.materials += value;
        break;
      default:
        bonuses[def.effect.kind] += value;
    }
  }

  // Two of these sit on top of numbers the combat model keeps inside a tuned
  // window on purpose (COMBAT.md §2). The clamp is applied to the total as well
  // as to each talent, because two talents in one tree can name the same lever.
  bonuses.damageReduction = Math.min(TALENT_CAP.damageReduction, bonuses.damageReduction);
  return bonuses;
}

/**
 * The stats the tree adds, as a share of what the hero already has.
 *
 * A percentage rather than a flat value: a flat one would be enormous at level
 * five and invisible at level five hundred. Applied to the durable total the
 * caller passes in, exactly like a set bonus (Q45), so the two never compound
 * with each other.
 */
export function talentStats(durable: StatBlock, bonuses: TalentBonuses): StatBlock {
  const stats = emptyStatBlock();
  for (const id of UPGRADABLE_STAT_IDS) {
    stats[id] = Math.round(durable[id] * bonuses.stats[id]);
  }
  return stats;
}

/**
 * What the tree is worth to Power Level (Brief §13).
 *
 * Counted **only** for talents that grant no stat. A rank of Brawn is already
 * visible to the bracket through the hero's Strength; a rank of Deadeye is not,
 * and the bracket has to know about it or a heavily-talented hero draws drops
 * sized for someone weaker. Counting the stat ranks here too would pay for them
 * twice and inflate the bracket, which is the direction §13 exists to prevent.
 */
export function talentPower(character: TalentedCharacter | null | undefined): number {
  if (!character) return 0;
  return (
    learned(character)
      .filter(({ def }) => def.effect.kind !== 'stat')
      .reduce((total, { def, rank }) => total + rank * rankCost(def.tier), 0) *
    POWER_PER_TALENT_POINT
  );
}

/** Every class's tree filled to the brim costs this many points. */
export function treeCost(classId: ClassId): number {
  return talentsFor(classId).reduce(
    (total, def) => total + TALENT_MAX_RANK * rankCost(def.tier),
    0,
  );
}

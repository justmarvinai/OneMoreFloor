/**
 * Set bonuses and unique powers, as the game reads them (Q45).
 *
 * Both answer the same complaint: before them, one helmet beat another only by
 * its budget, so two heroes at the same Power Level played identically and a
 * saved loadout was one stat block against another.
 *
 *  - A **set bonus** is a percentage of a stat, applied to the hero's durable
 *    total. Percentages rather than flat points because the tower has no top:
 *    "+40 Defense" is a build at floor 30 and a rounding error at floor 3,000.
 *  - A **unique power** is a rule the combat engine reads. It is not a stat, so
 *    it contributes nothing through the stat path — which is exactly why it has
 *    to contribute to Power Level directly, or a hero in five of them would
 *    draw drops sized for someone weaker (§13).
 */
import { SET_BONUS_MAGNITUDE, SET_THRESHOLDS } from '@/content/balance/uniques.ts';
import { ITEM_SETS, getSet, type SetDef } from '@/content/items/sets.ts';
import { requireItemDef } from '@/content/items/index.ts';
import type { UniquePowerId } from '@/content/items/uniques.ts';
import { STAT_IDS, type StatBlock, type StatId } from '../stats.ts';
import type { ItemInstance } from './types.ts';

export { ITEM_SETS, SET_THRESHOLDS };

/** How many pieces of a set a set has in total, across the six armour slots. */
export const SET_SIZE = SET_THRESHOLDS[SET_THRESHOLDS.length - 1] ?? 6;

export interface SetBonus {
  /** How many pieces it asks for. */
  pieces: number;
  stat: StatId;
  /** The fraction of that stat it adds. */
  magnitude: number;
  /** True when the hero is wearing enough for it. */
  active: boolean;
}

export interface SetStatus {
  set: SetDef;
  /** Pieces of it currently worn. */
  worn: number;
  bonuses: SetBonus[];
}

/** How many pieces of each set the hero has on, by set id. */
export function wornSetCounts(equipped: readonly ItemInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of equipped) {
    const setId = requireItemDef(item.defId).setId;
    if (setId === undefined) continue;
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Every set the hero has a piece of, with which thresholds are live.
 *
 * Sets they own nothing from are left out: a screen listing all three with zeros
 * beside them is a list of things that have not happened, and the bestiary is
 * already where the game shows what has not been found.
 */
export function setStatuses(equipped: readonly ItemInstance[]): SetStatus[] {
  const counts = wornSetCounts(equipped);
  const statuses: SetStatus[] = [];

  for (const set of ITEM_SETS) {
    const worn = counts.get(set.id) ?? 0;
    if (worn === 0) continue;
    statuses.push({ set, worn, bonuses: bonusesFor(set, worn) });
  }

  return statuses;
}

/** The three thresholds of one set, said in full whether or not they are live. */
export function bonusesFor(set: SetDef, worn: number): SetBonus[] {
  return SET_THRESHOLDS.map((pieces, index) => ({
    pieces,
    // A set whose `raises` list is shorter than the threshold list falls back to
    // its first stat rather than throwing: content should not be able to crash
    // a stat calculation.
    stat: set.raises[index] ?? set.raises[0] ?? 'strength',
    magnitude: SET_BONUS_MAGNITUDE[index] ?? 0,
    active: worn >= pieces,
  }));
}

/**
 * What the worn sets add, given the stats they are a percentage *of*.
 *
 * Taken from the durable total rather than from the base, so a set bonus is
 * worth more on a well-geared hero — which is the right direction: finishing a
 * set should feel like the reward for having climbed, not like a flat handout
 * that mattered most when you had nothing.
 */
export function setBonusStats(durable: StatBlock, equipped: readonly ItemInstance[]): StatBlock {
  const added: StatBlock = {
    strength: 0,
    defense: 0,
    hp: 0,
    resource: 0,
    luck: 0,
    speed: 0,
  };

  for (const status of setStatuses(equipped)) {
    for (const bonus of status.bonuses) {
      if (!bonus.active) continue;
      added[bonus.stat] += durable[bonus.stat] * bonus.magnitude;
    }
  }

  for (const stat of STAT_IDS) added[stat] = Math.round(added[stat]);
  return added;
}

/** Every unique power the hero is wearing, deduplicated and in slot order. */
export function wornPowers(equipped: readonly ItemInstance[]): UniquePowerId[] {
  const powers: UniquePowerId[] = [];
  for (const item of equipped) {
    const power = requireItemDef(item.defId).unique;
    if (power !== undefined && !powers.includes(power)) powers.push(power);
  }
  return powers;
}

/** The set a piece belongs to, for the tooltip that has to say so. */
export function setOf(item: ItemInstance): SetDef | undefined {
  const setId = requireItemDef(item.defId).setId;
  return setId === undefined ? undefined : getSet(setId);
}

/** The rules a piece carries, for the same tooltip. */
export function powerOf(item: ItemInstance): UniquePowerId | undefined {
  return requireItemDef(item.defId).unique;
}

/**
 * The stat vocabulary (Brief §6).
 *
 * The brief's one hard exception is encoded here in the type system rather than
 * in a comment: **Speed comes only from gear.** It is never granted by a level-up
 * and can never be bought with gold. `UpgradableStatId` excludes it, so anything
 * that levels or sells stats is structurally incapable of touching Speed — a
 * mistake that would otherwise be a balance bug nobody notices for months.
 */

export const STAT_IDS = ['strength', 'defense', 'hp', 'resource', 'luck', 'speed'] as const;

export type StatId = (typeof STAT_IDS)[number];

/**
 * Stats a level-up, a gold purchase or a potion can raise. Speed is absent by
 * design (§6) — gear is its only source, so it only ever appears on items.
 */
export type UpgradableStatId = Exclude<StatId, 'speed'>;

export const UPGRADABLE_STAT_IDS = STAT_IDS.filter((id): id is UpgradableStatId => id !== 'speed');

/** Every stat a unit can have, including the gear-only one. */
export type StatBlock = Record<StatId, number>;

/** The stats a class or level-up contributes: Speed cannot be expressed. */
export type GrowableStats = Record<UpgradableStatId, number>;

export function emptyStatBlock(): StatBlock {
  return { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0, speed: 0 };
}

/** Widen a growable block into a full one, with Speed at zero. */
export function toStatBlock(stats: GrowableStats): StatBlock {
  return { ...stats, speed: 0 };
}

export function addStats(a: StatBlock, b: StatBlock): StatBlock {
  return {
    strength: a.strength + b.strength,
    defense: a.defense + b.defense,
    hp: a.hp + b.hp,
    resource: a.resource + b.resource,
    luck: a.luck + b.luck,
    speed: a.speed + b.speed,
  };
}

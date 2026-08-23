/**
 * Potions (Brief §12).
 *
 * Five potions, one per stat a potion may raise — Speed has none, and cannot:
 * `UpgradableStatId` excludes it, so a sixth potion is not expressible (§6).
 *
 * They are *generated per bracket* rather than authored one by one, for the same
 * reason enemies are profiles rather than stat blocks: the tower is endless, and
 * a hand-written table would run out. A potion's identity is its stat; its tier
 * is which bracket it was brewed for.
 *
 * Q29 (owner, 2026-08-23): buying a potion drinks it — there is no potion
 * inventory, and none is coming. The brief never describes one, Q16 sized the
 * backpack for gear, and stockpiling cheap draughts to drink at a deeper bracket
 * would be §13's overshoot in another costume.
 */
import { POTION_MAGNITUDE, POTION_PRICE } from '@/content/balance/potions.ts';
import { UPGRADABLE_STAT_IDS, type UpgradableStatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

export interface PotionDef {
  /** Stable id, e.g. `potion.strength.b7`. */
  id: string;
  nameKey: StringKey;
  /** Painted icon art (never a `glyph-*` mask — see CONTENT_PIPELINE §4). */
  icon: string;
  stat: UpgradableStatId;
  /** The bracket this tier is brewed for. */
  tier: number;
  /** Fraction of the stat it adds while active. */
  magnitude: number;
  price: number;
}

const ART: Readonly<Record<UpgradableStatId, string>> = {
  strength: 'tech-serum-injector',
  defense: 'tech-coolant-flask',
  hp: 'icon-potion',
  resource: 'blood-chalice',
  luck: 'tech-alchemy-pour',
};

const NAME: Readonly<Record<UpgradableStatId, StringKey>> = {
  strength: 'potion.strength',
  defense: 'potion.defense',
  hp: 'potion.hp',
  resource: 'potion.resource',
  luck: 'potion.luck',
};

/** Every stat a potion can raise (Brief §12 × §6). Speed is absent by type. */
export const POTION_STATS: readonly UpgradableStatId[] = UPGRADABLE_STAT_IDS;

export function potionMagnitude(bracketIndex: number): number {
  const { base, perBracket, max } = POTION_MAGNITUDE;
  return Math.min(max, base + perBracket * Math.max(0, bracketIndex));
}

export function potionPrice(bracketIndex: number): number {
  const { base, bracketFactor } = POTION_PRICE;
  return Math.round(base * Math.pow(bracketFactor, Math.max(0, bracketIndex)));
}

/** The potion a merchant at this bracket sells for this stat. */
export function potionFor(stat: UpgradableStatId, bracketIndex: number): PotionDef {
  const tier = Math.max(0, Math.floor(bracketIndex));
  return {
    id: `potion.${stat}.b${tier}`,
    nameKey: NAME[stat],
    icon: ART[stat],
    stat,
    tier,
    magnitude: potionMagnitude(tier),
    price: potionPrice(tier),
  };
}

/** The whole shelf at a bracket — one potion per stat (Q18's concurrency set). */
export function potionsForBracket(bracketIndex: number): PotionDef[] {
  return POTION_STATS.map((stat) => potionFor(stat, bracketIndex));
}

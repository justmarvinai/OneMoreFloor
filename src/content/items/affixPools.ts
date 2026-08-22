/**
 * Affix pools — what each kind of gear can roll, and how likely each stat is.
 *
 * Pools are what give a piece its character before any number is rolled: a bow
 * leans into the Luck a Hunter turns into damage, armour leans into staying
 * alive, and Speed appears here and nowhere else in the entire game (Brief §6).
 *
 * The two accessory pools implement Q5's answer directly — Necklace rolls from
 * the offensive pool, Amulet from the defensive one, so the two slots feel
 * different without needing different machinery.
 *
 * Weights are relative, not percentages, and are tuned in M9 (BALANCE.md §10).
 */
import type { AffixWeights } from '@/domain/items/generate.ts';
import type { AffixPoolId } from '@/domain/items/types.ts';

export const AFFIX_POOLS: Readonly<Record<AffixPoolId, AffixWeights>> = {
  armor: { defense: 34, hp: 34, resource: 12, strength: 6, luck: 8, speed: 6 },
  weapon_melee: { strength: 42, luck: 18, speed: 16, resource: 8, hp: 10, defense: 6 },
  weapon_ranged: { strength: 34, luck: 28, speed: 20, resource: 8, hp: 6, defense: 4 },
  weapon_magic: { strength: 34, resource: 28, luck: 16, speed: 10, hp: 8, defense: 4 },
  shield: { defense: 40, hp: 32, resource: 12, strength: 8, luck: 4, speed: 4 },
  // Q5: the Necklace's pool — offense-leaning.
  accessory_offense: { strength: 30, luck: 30, speed: 22, resource: 12, hp: 4, defense: 2 },
  // Q5: the Amulet's pool — defense and sustain.
  accessory_defense: { hp: 32, defense: 30, resource: 24, luck: 8, strength: 4, speed: 2 },
};

export function affixPool(id: AffixPoolId): AffixWeights {
  return AFFIX_POOLS[id];
}

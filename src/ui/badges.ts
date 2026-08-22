/**
 * Red-dot truth (Brief §20.5).
 *
 * One service decides every notification dot in the game, from one rule: **a dot
 * means there is something the player can do right now.** Not "something new
 * exists", not "you haven't looked here lately" — something they can act on with
 * what they currently hold.
 *
 * Computing it in one place is what keeps that honest. A dot each screen decides
 * for itself drifts into decoration within a milestone, and a player who learns
 * that dots lie stops reading them at all.
 */
import {
  canAscendGear,
  canLevelUp,
  gearAscensionCost,
  gearLevelCost,
} from '@/domain/items/upgrade.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import { statUpgradeCost } from '@/domain/economy/statUpgrades.ts';
import { canAscend } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import type { ItemInstance } from '@/domain/items/types.ts';
import { MERCHANT_IDS, needsRestock, stockOf } from '@/domain/merchants/merchants.ts';
import { potionStock } from '@/domain/merchants/merchants.ts';
import { bracketForCharacter } from '@/domain/tower/run.ts';
import { UPGRADABLE_STAT_IDS } from '@/domain/stats.ts';
import type { ShellSection } from '@/ui/shell.ts';

export type Badges = Record<ShellSection, boolean>;

export function computeBadges(character: Character, now: number): Badges {
  return {
    // Climbing is always available, so a dot here would say nothing.
    tower: false,
    character: hasCharacterAction(character),
    merchants: hasMerchantAction(character, now),
    // Quests arrive in M6; nothing to claim before they exist.
    quests: false,
  };
}

function hasCharacterAction(character: Character): boolean {
  if (canAscend(character)) return true;

  const gold = character.currencies.gold;
  for (const stat of UPGRADABLE_STAT_IDS) {
    if (statUpgradeCost(stat, character.purchasedStats[stat]) <= gold) return true;
  }

  for (const item of ownedItems(character)) {
    if (canLevelUp(item) && gearLevelCost(item) <= gold) return true;
    if (canAscendGear(item) && canAffordAscension(character, item)) return true;
  }
  return false;
}

function canAffordAscension(character: Character, item: ItemInstance): boolean {
  const cost = gearAscensionCost(item, materialIdForTier);
  if (!cost || character.currencies.gold < cost.gold) return false;
  return Object.entries(cost.materials).every(
    ([id, need]) => (character.materials[id] ?? 0) >= need,
  );
}

function hasMerchantAction(character: Character, now: number): boolean {
  const bracket = bracketForCharacter(character);
  const context = {
    now,
    bracketIndex: bracket.index,
    highestFloor: character.tower.highestFloorEverCleared,
  };
  const gold = character.currencies.gold;

  for (const id of MERCHANT_IDS) {
    const state = character.merchants[id];
    // Fresh goods are worth a look even before affordability is known.
    if (needsRestock(state, context)) return true;

    const affordable = stockOf(id, character, state, bracket).some(
      (entry) => !entry.sold && entry.price <= gold,
    );
    if (affordable) return true;
  }

  return potionStock(bracket).some((potion) => potion.price <= gold);
}

function ownedItems(character: Character): ItemInstance[] {
  return [
    ...Object.values(character.equipment).filter(
      (item): item is ItemInstance => item !== undefined,
    ),
    ...character.inventory,
  ];
}

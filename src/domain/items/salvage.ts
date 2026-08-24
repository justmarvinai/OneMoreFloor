/**
 * Salvage and reforge (fifth polish round).
 *
 * Both are answers to the same change the drop retune made: gear stopped
 * raining, so the pieces that do arrive matter more, and the two things a player
 * wants to do with an unwanted one are *turn it into fuel* and *make it the
 * piece it nearly was*.
 *
 *  - **Salvage** breaks a piece into ascension materials instead of gold. There
 *    is no roll: the player is choosing between two irreversible options and
 *    deserves to be told exactly what each gives.
 *  - **Reforge** rerolls which stats a piece carries, inside the window it was
 *    born in. It can therefore never overshoot the bracket that produced it
 *    (§13), while a player willing to keep paying can reach the budget the
 *    luckiest possible drop would have had — investment reaching what luck
 *    could (BALANCE §10).
 */
import {
  REFORGE_GOLD_MULTIPLIER,
  REFORGE_MATERIAL_COUNT,
  SALVAGE_ASCENSION_BONUS,
  SALVAGE_ASCENSION_HIGH_TIER_PER_STAR,
  SALVAGE_BASE_COUNT,
  SALVAGE_LEVEL_BONUS,
  SALVAGE_RARITY_BONUS,
} from '@/content/balance/items.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import { createRng } from '@/app/rng.ts';
import { bracketAt } from '../power/brackets.ts';
import type { Character } from '../character/types.ts';
import { rerollAffixes } from './generate.ts';
import { itemGoldValue } from './upgrade.ts';
import type { ItemInstance, MaterialCost } from './types.ts';

/**
 * What breaking this piece down yields.
 *
 * Everything comes back at the piece's own material tier except the part that
 * ascension put in, which came from a tier deeper and partly returns there.
 */
export function salvageYield(item: ItemInstance): MaterialCost {
  const tier = bracketAt(item.bracketAtDrop).materialTier;
  const own =
    SALVAGE_BASE_COUNT +
    (SALVAGE_RARITY_BONUS[item.rarity] ?? 0) +
    Math.floor(item.level * SALVAGE_LEVEL_BONUS) +
    item.ascension * SALVAGE_ASCENSION_BONUS;

  const yielded: Record<string, number> = {
    [materialIdForTier(tier)]: Math.max(1, own),
  };

  const deeper = item.ascension * SALVAGE_ASCENSION_HIGH_TIER_PER_STAR;
  if (deeper > 0) {
    const id = materialIdForTier(tier + 1);
    yielded[id] = (yielded[id] ?? 0) + deeper;
  }

  return yielded;
}

export interface SalvageResult {
  character: Character;
  materials: MaterialCost;
}

/**
 * Break a backpack piece down. Worn gear is not offered, for the same reason
 * selling it is not: it would be a misclick with consequences (Q16).
 */
export function salvageFromInventory(character: Character, uid: string): SalvageResult | null {
  const item = character.inventory.find((candidate) => candidate.uid === uid);
  if (!item) return null;

  const yielded = salvageYield(item);
  const materials = { ...character.materials };
  for (const [id, count] of Object.entries(yielded)) {
    materials[id] = (materials[id] ?? 0) + count;
  }

  return {
    character: {
      ...character,
      materials,
      inventory: character.inventory.filter((candidate) => candidate.uid !== uid),
    },
    materials: yielded,
  };
}

export interface ReforgeCost {
  gold: number;
  materials: MaterialCost;
}

/** What one reroll asks for. Flat, because the window caps what it can buy. */
export function reforgeCost(item: ItemInstance): ReforgeCost {
  const tier = bracketAt(item.bracketAtDrop).materialTier;
  return {
    gold: Math.max(1, Math.round(itemGoldValue(item) * REFORGE_GOLD_MULTIPLIER)),
    materials: { [materialIdForTier(tier)]: REFORGE_MATERIAL_COUNT },
  };
}

export type ReforgeRefusal = 'notFound' | 'notEnoughGold' | 'notEnoughMaterials';

export interface ReforgeResult {
  character: Character;
  item: ItemInstance;
  cost: ReforgeCost;
}

/**
 * Reroll a piece's affixes.
 *
 * The seed is the piece's *current* state rather than a stored counter, which is
 * what lets a second reforge differ from the first without a save-shape change:
 * every reroll moves the state, so every reroll draws a different stream. Same
 * save plus same action still gives the same result, which is the property
 * replays need (ARCHITECTURE §5).
 */
export function reforge(character: Character, uid: string): ReforgeResult | ReforgeRefusal {
  const found = locate(character, uid);
  if (!found) return 'notFound';

  const { item, worn } = found;
  const cost = reforgeCost(item);
  if (character.currencies.gold < cost.gold) return 'notEnoughGold';
  for (const [id, count] of Object.entries(cost.materials)) {
    if ((character.materials[id] ?? 0) < count) return 'notEnoughMaterials';
  }

  const def = requireItemDef(item.defId);
  const rerolled = rerollAffixes({
    item,
    weights: affixPool(def.affixPool),
    bracket: bracketAt(item.bracketAtDrop),
    rng: createRng(reforgeSeed(item)),
  });

  const materials = { ...character.materials };
  for (const [id, count] of Object.entries(cost.materials)) {
    materials[id] = (materials[id] ?? 0) - count;
  }

  const swap = (candidate: ItemInstance): ItemInstance =>
    candidate.uid === uid ? rerolled : candidate;

  return {
    character: {
      ...character,
      currencies: { ...character.currencies, gold: character.currencies.gold - cost.gold },
      materials,
      inventory: character.inventory.map(swap),
      equipment: worn ? { ...character.equipment, [worn]: rerolled } : character.equipment,
    },
    item: rerolled,
    cost,
  };
}

function reforgeSeed(item: ItemInstance): string {
  const shape = item.affixes.map((affix) => `${affix.stat}:${affix.value}`).join('/');
  return `reforge:${item.uid}:${item.budget}:${shape}`;
}

function locate(
  character: Character,
  uid: string,
): { item: ItemInstance; worn: keyof Character['equipment'] | null } | null {
  for (const [slot, item] of Object.entries(character.equipment)) {
    if (item?.uid === uid) return { item, worn: slot as keyof Character['equipment'] };
  }
  const carried = character.inventory.find((item) => item.uid === uid);
  return carried ? { item: carried, worn: null } : null;
}

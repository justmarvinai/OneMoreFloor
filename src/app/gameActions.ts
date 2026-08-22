/**
 * The actions a player takes once they are *in* the game.
 *
 * Same contract as the rest of the session (see `session.ts`): screens call
 * these, never IndexedDB and never the store. Each one changes the persisted
 * truth first, then the in-memory truth, so a tab that dies between the two
 * loses nothing that mattered.
 *
 * Every refusal carries a reason. A greyed-out button that will not say why is
 * the single most common way a game stops explaining itself (Brief §20.5), and
 * the only way to avoid it at the screen level is to have it here first.
 */
import {
  ascendGear,
  canAscendGear,
  canLevelUp,
  gearAscensionCost,
  gearLevelCost,
  levelUp,
} from '@/domain/items/upgrade.ts';
import { equipFromInventory, unequip, type LoadoutRefusal } from '@/domain/items/loadout.ts';
import {
  addToInventory,
  findInInventory,
  isFull,
  sellFromInventory,
} from '@/domain/items/inventory.ts';
import { rollAscensionAffix } from '@/domain/items/generate.ts';
import { affixCapacity } from '@/domain/items/upgrade.ts';
import type { ItemInstance } from '@/domain/items/types.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { materialIdForTier, requireItemDef } from '@/content/items/index.ts';
import { potionFor } from '@/content/items/potions.ts';
import { buyStatPoints } from '@/domain/economy/statUpgrades.ts';
import { ascendHero } from '@/domain/progression/xp.ts';
import { canAscend } from '@/domain/character/character.ts';
import type { Character, EquipSlotId, SlotId } from '@/domain/character/types.ts';
import { drink } from '@/domain/potions/potions.ts';
import {
  needsRestock,
  restock,
  rerollCost,
  stockOf,
  type MerchantId,
} from '@/domain/merchants/merchants.ts';
import { bracketForCharacter, fightFloor, quickRaid } from '@/domain/tower/run.ts';
import type { FloorResult, QuickRaidResult } from '@/domain/tower/run.ts';
import type { UpgradableStatId } from '@/domain/stats.ts';
import type { SaveLayer } from '@/save/saveLayer.ts';
import { createRng } from './rng.ts';
import { characterEntered, type AppStore } from './state.ts';
import { clock } from './time.ts';

/** Everything that can stop an action, in one vocabulary the UI can translate. */
export type Refusal =
  | LoadoutRefusal
  | 'notEnoughGold'
  | 'notEnoughMaterials'
  | 'maxLevel'
  | 'maxAscension'
  | 'notAtLevelCap'
  | 'soldOut'
  | 'noCharacter';

export type Outcome<T = undefined> =
  { ok: true; value: T; character: Character } | { ok: false; reason: Refusal };

export interface GameActions {
  fight(floor: number): Promise<FloorResult>;
  raid(throughFloor: number): Promise<QuickRaidResult>;

  equip(uid: string): Promise<Outcome<ItemInstance[]>>;
  unequipSlot(slot: EquipSlotId): Promise<Outcome<ItemInstance[]>>;
  sell(uid: string): Promise<Outcome<number>>;

  upgradeGear(uid: string): Promise<Outcome>;
  ascendGearPiece(uid: string): Promise<Outcome>;
  buyStat(stat: UpgradableStatId, count: number): Promise<Outcome<number>>;
  ascend(): Promise<Outcome>;

  /** Restock if the shelf is stale, and return the character that owns it (Q17). */
  visitMerchant(id: MerchantId): Promise<Character>;
  buyFromMerchant(id: MerchantId, index: number): Promise<Outcome<ItemInstance>>;
  rerollMerchant(id: MerchantId): Promise<Outcome<number>>;
  drinkPotion(stat: UpgradableStatId): Promise<Outcome<number>>;
}

export function createGameActions(save: SaveLayer, store: AppStore): GameActions {
  /** Persist, then let the store notice — in that order (SAVE_SCHEMA §5). */
  async function commit(character: Character): Promise<Character> {
    await save.saveCharacter(character);
    characterEntered(store, character);
    return character;
  }

  function active(): Character {
    const character = store.get().activeCharacter;
    if (!character) throw new Error('[actions] no active character');
    return character;
  }

  /** Find a piece wherever it is: worn or in the pack. */
  function locate(
    character: Character,
    uid: string,
  ): { item: ItemInstance; slot: EquipSlotId | null } | null {
    for (const [slot, worn] of Object.entries(character.equipment)) {
      if (worn?.uid === uid) return { item: worn, slot: slot as EquipSlotId };
    }
    const carried = findInInventory(character, uid);
    return carried ? { item: carried, slot: null } : null;
  }

  /** Write a changed item back wherever it lives. */
  function replace(character: Character, uid: string, next: ItemInstance): Character {
    const found = locate(character, uid);
    if (!found) return character;
    if (found.slot) {
      return { ...character, equipment: { ...character.equipment, [found.slot]: next } };
    }
    return {
      ...character,
      inventory: character.inventory.map((item) => (item.uid === uid ? next : item)),
    };
  }

  function spendGold(character: Character, gold: number): Character {
    return {
      ...character,
      currencies: { ...character.currencies, gold: character.currencies.gold - gold },
    };
  }

  /** Bring a merchant's shelf up to date if it has aged out (Q17). */
  function refreshed(character: Character, id: MerchantId): Character {
    const context = {
      now: clock().now(),
      bracketIndex: bracketForCharacter(character).index,
      highestFloor: character.tower.highestFloorEverCleared,
    };
    if (!needsRestock(character.merchants[id], context)) return character;

    return {
      ...character,
      merchants: {
        ...character.merchants,
        [id]: restock(id, character.tower.runSeed, context),
      },
    };
  }

  return {
    async fight(floor) {
      const result = fightFloor(active(), floor, clock().now());
      await commit(result.character);
      return result;
    },

    async raid(throughFloor) {
      const result = quickRaid(active(), throughFloor, clock().now());
      await commit(result.character);
      return result;
    },

    async equip(uid) {
      const result = equipFromInventory(active(), uid);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: result.displaced, character: await commit(result.character) };
    },

    async unequipSlot(slot) {
      const result = unequip(active(), slot);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: result.displaced, character: await commit(result.character) };
    },

    async sell(uid) {
      const sale = sellFromInventory(active(), uid);
      if (!sale) return { ok: false, reason: 'notFound' };
      return { ok: true, value: sale.gold, character: await commit(sale.character) };
    },

    async upgradeGear(uid) {
      const character = active();
      const found = locate(character, uid);
      if (!found) return { ok: false, reason: 'notFound' };
      if (!canLevelUp(found.item)) return { ok: false, reason: 'maxLevel' };

      const cost = gearLevelCost(found.item);
      if (character.currencies.gold < cost) return { ok: false, reason: 'notEnoughGold' };

      const upgraded = replace(spendGold(character, cost), uid, levelUp(found.item));
      return { ok: true, value: undefined, character: await commit(upgraded) };
    },

    async ascendGearPiece(uid) {
      const character = active();
      const found = locate(character, uid);
      if (!found) return { ok: false, reason: 'notFound' };
      if (!canAscendGear(found.item)) return { ok: false, reason: 'maxAscension' };

      const cost = gearAscensionCost(found.item, materialIdForTier);
      if (!cost) return { ok: false, reason: 'maxAscension' };
      if (character.currencies.gold < cost.gold) return { ok: false, reason: 'notEnoughGold' };
      for (const [id, count] of Object.entries(cost.materials)) {
        if ((character.materials[id] ?? 0) < count) {
          return { ok: false, reason: 'notEnoughMaterials' };
        }
      }

      let ascended = ascendGear(found.item);
      // A star that opens a slot fills it, so ascending always shows its work.
      if (ascended.affixes.length < affixCapacity(ascended)) {
        const def = requireItemDef(ascended.defId);
        const affix = rollAscensionAffix(
          ascended,
          affixPool(def.affixPool),
          createRng(`${ascended.uid}/ascend:${ascended.ascension}`),
        );
        if (affix) ascended = { ...ascended, affixes: [...ascended.affixes, affix] };
      }

      const materials = { ...character.materials };
      for (const [id, count] of Object.entries(cost.materials)) {
        materials[id] = (materials[id] ?? 0) - count;
      }

      const next = replace({ ...spendGold(character, cost.gold), materials }, uid, ascended);
      return { ok: true, value: undefined, character: await commit(next) };
    },

    async buyStat(stat, count) {
      const character = active();
      const result = buyStatPoints(
        character.purchasedStats,
        stat,
        character.currencies.gold,
        count,
      );
      if (result.pointsBought === 0) return { ok: false, reason: 'notEnoughGold' };

      const next: Character = {
        ...spendGold(character, result.goldSpent),
        purchasedStats: result.purchased,
      };
      return { ok: true, value: result.pointsBought, character: await commit(next) };
    },

    async ascend() {
      const character = active();
      if (!canAscend(character)) return { ok: false, reason: 'notAtLevelCap' };
      const result = ascendHero(character);
      if (!result) return { ok: false, reason: 'maxAscension' };
      return { ok: true, value: undefined, character: await commit(result.character) };
    },

    async visitMerchant(id) {
      const character = active();
      const next = refreshed(character, id);
      return next === character ? character : commit(next);
    },

    async buyFromMerchant(id, index) {
      const character = refreshed(active(), id);
      const state = character.merchants[id];
      const entry = stockOf(id, character, state, bracketForCharacter(character)).find(
        (candidate) => candidate.index === index,
      );

      if (!entry) return { ok: false, reason: 'notFound' };
      if (entry.sold) return { ok: false, reason: 'soldOut' };
      if (character.currencies.gold < entry.price) return { ok: false, reason: 'notEnoughGold' };
      if (isFull(character)) return { ok: false, reason: 'backpackFull' };

      const added = addToInventory(spendGold(character, entry.price), entry.item);
      if (!added.ok) return { ok: false, reason: 'backpackFull' };

      const next: Character = {
        ...added.character,
        merchants: {
          ...added.character.merchants,
          [id]: { ...state, sold: [...state.sold, index] },
        },
      };
      return { ok: true, value: entry.item, character: await commit(next) };
    },

    async rerollMerchant(id) {
      const character = active();
      const bracket = bracketForCharacter(character);
      const cost = rerollCost(bracket.index);
      if (character.currencies.gold < cost) return { ok: false, reason: 'notEnoughGold' };

      const context = {
        now: clock().now(),
        bracketIndex: bracket.index,
        highestFloor: character.tower.highestFloorEverCleared,
      };
      const next: Character = {
        ...spendGold(character, cost),
        merchants: {
          ...character.merchants,
          [id]: restock(id, character.tower.runSeed, context),
        },
      };
      return { ok: true, value: cost, character: await commit(next) };
    },

    async drinkPotion(stat) {
      const character = active();
      const potion = potionFor(stat, bracketForCharacter(character).index);
      if (character.currencies.gold < potion.price) return { ok: false, reason: 'notEnoughGold' };

      const next: Character = {
        ...spendGold(character, potion.price),
        potions: drink(character.potions, potion, clock().now()),
      };
      return { ok: true, value: potion.price, character: await commit(next) };
    },
  };
}

export type { SlotId };

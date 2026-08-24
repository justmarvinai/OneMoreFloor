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
import { backpackCapacity } from '@/domain/character/account.ts';
import { availableSlots } from '@/domain/items/equip.ts';
import { equipFromInventory, unequip, type LoadoutRefusal } from '@/domain/items/loadout.ts';
import {
  applyLoadout,
  captureLoadout,
  type ApplyRefusal as PresetApplyRefusal,
  type CaptureRefusal as PresetCaptureRefusal,
} from '@/domain/items/presets.ts';
import {
  addToInventory,
  findInInventory,
  isFull,
  sellFromInventory,
} from '@/domain/items/inventory.ts';
import { rollAscensionAffix } from '@/domain/items/generate.ts';
import { affixCapacity } from '@/domain/items/upgrade.ts';
import type { ItemInstance, MaterialCost } from '@/domain/items/types.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { materialIdForTier, requireItemDef } from '@/content/items/index.ts';
import { potionFor } from '@/content/items/potions.ts';
import { buyStatPoints } from '@/domain/economy/statUpgrades.ts';
import { ascendHero } from '@/domain/progression/xp.ts';
import { canAscend } from '@/domain/character/character.ts';
import type { AutoClimbMode, Character, EquipSlotId, SlotId } from '@/domain/character/types.ts';
import { drink } from '@/domain/potions/potions.ts';
import {
  needsRestock,
  restock,
  rerollCost,
  stockOf,
  type MerchantId,
} from '@/domain/merchants/merchants.ts';
import { bracketForCharacter, fightFloor, quickRaid } from '@/domain/tower/run.ts';
import { canAutoClimb } from '@/domain/tower/autoClimb.ts';
import type { FloorResult, QuickRaidResult } from '@/domain/tower/run.ts';
import {
  claimableCount,
  isClaimable,
  markClaimed,
  recordEvent,
  refreshBoards,
  type QuestEvent,
} from '@/domain/quests/quests.ts';
import type { QuestCadence } from '@/content/quests/types.ts';
import { grantReward } from '@/domain/rewards/grant.ts';
import { buyUpgrade, type UpgradeId } from '@/domain/account/upgrades.ts';
import { recordKills } from '@/domain/account/bestiary.ts';
import { toggleCurse, type CurseRefusal } from '@/domain/tower/curses.ts';
import { reforge, salvageFromInventory } from '@/domain/items/salvage.ts';
import {
  canPull,
  pull,
  spendCurrency,
  type BannerId,
  type PullResult,
} from '@/domain/gacha/gacha.ts';
import { TUTORIAL_REWARD } from '@/content/balance/account.ts';
import { accountLoaded } from './state.ts';
import type { UpgradableStatId } from '@/domain/stats.ts';
import type { SaveLayer } from '@/save/saveLayer.ts';
import { createRng } from './rng.ts';
import { characterEntered, type AppStore } from './state.ts';
import { clock } from './time.ts';

/** Everything that can stop an action, in one vocabulary the UI can translate. */
export type Refusal =
  | LoadoutRefusal
  | CurseRefusal
  | PresetApplyRefusal
  | PresetCaptureRefusal
  | 'notEnoughGold'
  | 'notEnoughMaterials'
  | 'maxLevel'
  | 'maxAscension'
  | 'notAtLevelCap'
  | 'soldOut'
  | 'notClaimable'
  | 'maxed'
  | 'noCurrency'
  | 'noCharacter';

export type Outcome<T = undefined> =
  { ok: true; value: T; character: Character } | { ok: false; reason: Refusal };

export interface GameActions {
  fight(floor: number): Promise<FloorResult>;
  /** Turn auto-climb on, off, or on in the background (Q32). */
  setAutoClimb(mode: AutoClimbMode): Promise<Outcome>;
  raid(throughFloor: number): Promise<QuickRaidResult>;

  equip(uid: string): Promise<Outcome<ItemInstance[]>>;
  /** Save what the hero is wearing into preset `index` (fifth polish round). */
  saveLoadout(index: number, name: string): Promise<Outcome>;
  /** Wear preset `index`; the value is how many of its pieces are gone. */
  wearLoadout(index: number): Promise<Outcome<number>>;
  unequipSlot(slot: EquipSlotId): Promise<Outcome<ItemInstance[]>>;
  sell(uid: string): Promise<Outcome<number>>;

  /** Break a backpack piece into ascension materials (fifth polish round). */
  salvage(uid: string): Promise<Outcome<MaterialCost>>;
  /** Reroll a piece's affixes for gold and materials (fifth polish round). */
  reforgeGear(uid: string): Promise<Outcome<ItemInstance>>;

  upgradeGear(uid: string): Promise<Outcome>;
  ascendGearPiece(uid: string): Promise<Outcome>;
  buyStat(stat: UpgradableStatId, count: number): Promise<Outcome<number>>;
  ascend(): Promise<Outcome>;

  /** Restock if the shelf is stale, and return the character that owns it (Q17). */
  visitMerchant(id: MerchantId): Promise<Character>;
  buyFromMerchant(id: MerchantId, index: number): Promise<Outcome<ItemInstance>>;
  rerollMerchant(id: MerchantId): Promise<Outcome<number>>;
  drinkPotion(stat: UpgradableStatId): Promise<Outcome<number>>;

  /** Bring both quest boards up to date for the current period (Q10). */
  visitQuests(): Promise<Character>;
  claimQuest(cadence: QuestCadence, index: number): Promise<Outcome<number>>;
  /** Take a curse, or lift one (Q35). */
  toggleCurse(id: string): Promise<Outcome>;
  /**
   * Aim what the rites hand over at one slot, or clear the wish (Q33).
   * Refuses a slot the hero has not unlocked, rather than wishing into a
   * socket that does not exist yet.
   */
  setWishlist(slot: EquipSlotId | null): Promise<Outcome>;
  /** Buy one of the two account upgrades (Brief §15). */
  buyUpgrade(id: UpgradeId): Promise<Outcome<number>>;

  /**
   * Spend one ticket on one pull (Brief §16, Q20).
   *
   * The result is banked *before* the reveal plays, deliberately: a player who
   * closes the tab mid-animation has still had the pull they paid for.
   */
  pullBanner(banner: BannerId): Promise<Outcome<PullResult>>;
  /**
   * Close the tutorial. `rewarded` is false when it was skipped: §18 calls the
   * Lucky Ticket a *completion* reward, and paying it for skipping would make
   * the nudge a lie.
   */
  finishTutorial(rewarded: boolean): Promise<void>;
}

export function createGameActions(save: SaveLayer, store: AppStore): GameActions {
  /** Persist, then let the store notice — in that order (SAVE_SCHEMA §5). */
  async function commit(character: Character): Promise<Character> {
    await save.saveCharacter(character);
    characterEntered(store, character);
    return character;
  }

  function questContext(character: Character) {
    const bracket = bracketForCharacter(character);
    return {
      bracketIndex: bracket.index,
      materialTier: bracket.materialTier,
      referenceFloor: Math.max(1, character.tower.highestFloorEverCleared),
      seed: character.tower.runSeed,
    };
  }

  /**
   * Bring the boards up to date, then tell them what the player just did.
   *
   * Refreshing on every action rather than only when the quest screen opens is
   * what makes a day boundary crossed mid-session behave: the old board closes
   * and the new one starts counting from the very next floor (Q10).
   */
  function withQuests(character: Character, events: QuestEvent[]): Character {
    const timing = clock();
    const refreshed = refreshBoards(
      character.quests,
      { dayKey: timing.dayKey(), weekKey: timing.weekKey() },
      questContext(character),
    );

    let quests = refreshed;
    for (const event of events) quests = recordEvent(quests, event);
    return quests === character.quests ? character : { ...character, quests };
  }

  /** The quest events a finished floor produces. */
  function floorEvents(result: FloorResult): QuestEvent[] {
    if (!result.cleared) return [];
    return [
      { kind: 'floorCleared', floor: result.floor, isBoss: result.isBoss },
      ...(result.reward && result.reward.gold > 0
        ? [{ kind: 'goldEarned' as const, amount: result.reward.gold }]
        : []),
    ];
  }

  /**
   * Write what the hero killed into the account's bestiary.
   *
   * Only cleared floors count — an enemy that killed you is one you met, but a
   * bestiary that fills up from losing would be a list of what has beaten you.
   * Kills belong to the account rather than the character (Q4): what a player
   * has seen of the tower is knowledge, and a reset does not unlearn it.
   */
  async function recordSightings(floors: readonly FloorResult[]): Promise<void> {
    const account = store.get().account;
    if (!account) return;

    const killed = floors.filter((floor) => floor.cleared).map((floor) => floor.generated.enemy.id);
    const updated = recordKills(account, killed);
    if (updated === account) return;

    await save.saveAccount(updated);
    accountLoaded(store, updated);
  }

  /** The bag's size right now — an account upgrade, so it is read, not assumed. */
  function capacity(): number {
    return backpackCapacity(store.get().account ?? { backpackSlots: 0 });
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
      const character = withQuests(result.character, floorEvents(result));
      await commit(character);
      await recordSightings([result]);
      return { ...result, character };
    },

    async setAutoClimb(mode) {
      const character = active();
      // A mode the hero has not unlocked is refused rather than silently
      // downgraded — the control has to be able to say why (§20.5).
      if (!canAutoClimb(mode, character)) return { ok: false, reason: 'notAtLevelCap' };
      return {
        ok: true,
        value: undefined,
        character: await commit({
          ...character,
          tower: { ...character.tower, autoClimb: mode },
        }),
      };
    },

    async raid(throughFloor) {
      const result = quickRaid(active(), throughFloor, clock().now());
      const events = result.floors.flatMap(floorEvents);
      const character = withQuests(result.character, events);
      await commit(character);
      // One account write for the whole raid rather than one per floor.
      await recordSightings(result.floors);
      return { ...result, character };
    },

    async equip(uid) {
      const result = equipFromInventory(active(), uid, capacity());
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: result.displaced, character: await commit(result.character) };
    },

    async saveLoadout(index, name) {
      const saved = captureLoadout(active(), index, name);
      if (typeof saved === 'string') return { ok: false, reason: saved };
      return { ok: true, value: undefined, character: await commit(saved) };
    },

    async wearLoadout(index) {
      const result = applyLoadout(active(), index, capacity());
      if (typeof result === 'string') return { ok: false, reason: result };
      return { ok: true, value: result.missing, character: await commit(result.character) };
    },

    async unequipSlot(slot) {
      const result = unequip(active(), slot, capacity());
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: result.displaced, character: await commit(result.character) };
    },

    async sell(uid) {
      const sale = sellFromInventory(active(), uid);
      if (!sale) return { ok: false, reason: 'notFound' };
      const character = withQuests(sale.character, [
        { kind: 'itemSold' },
        { kind: 'goldEarned', amount: sale.gold },
      ]);
      return { ok: true, value: sale.gold, character: await commit(character) };
    },

    async salvage(uid) {
      const broken = salvageFromInventory(active(), uid);
      if (!broken) return { ok: false, reason: 'notFound' };
      // Salvage is a piece leaving the pack the same way a sale is, and the
      // quest board counts pieces parted with rather than gold taken for them.
      const character = withQuests(broken.character, [{ kind: 'itemSold' }]);
      return { ok: true, value: broken.materials, character: await commit(character) };
    },

    async reforgeGear(uid) {
      const result = reforge(active(), uid);
      if (typeof result === 'string') return { ok: false, reason: result };
      const character = withQuests(result.character, [
        { kind: 'goldSpent', amount: result.cost.gold },
      ]);
      return { ok: true, value: result.item, character: await commit(character) };
    },

    async upgradeGear(uid) {
      const character = active();
      const found = locate(character, uid);
      if (!found) return { ok: false, reason: 'notFound' };
      if (!canLevelUp(found.item)) return { ok: false, reason: 'maxLevel' };

      const cost = gearLevelCost(found.item);
      if (character.currencies.gold < cost) return { ok: false, reason: 'notEnoughGold' };

      const upgraded = withQuests(replace(spendGold(character, cost), uid, levelUp(found.item)), [
        { kind: 'gearUpgraded' },
        { kind: 'goldSpent', amount: cost },
      ]);
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

      const next = withQuests(
        replace({ ...spendGold(character, cost.gold), materials }, uid, ascended),
        [{ kind: 'gearUpgraded' }, { kind: 'goldSpent', amount: cost.gold }],
      );
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

      const next = withQuests(
        { ...spendGold(character, result.goldSpent), purchasedStats: result.purchased },
        [{ kind: 'goldSpent', amount: result.goldSpent }],
      );
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
      if (isFull(character, capacity())) return { ok: false, reason: 'backpackFull' };

      const added = addToInventory(spendGold(character, entry.price), entry.item, capacity());
      if (!added.ok) return { ok: false, reason: 'backpackFull' };

      const next = withQuests(
        {
          ...added.character,
          merchants: {
            ...added.character.merchants,
            [id]: { ...state, sold: [...state.sold, index] },
          },
        },
        [{ kind: 'itemBought' }, { kind: 'goldSpent', amount: entry.price }],
      );
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
      const next = withQuests(
        {
          ...spendGold(character, cost),
          merchants: {
            ...character.merchants,
            [id]: restock(id, character.tower.runSeed, context),
          },
        },
        [{ kind: 'goldSpent', amount: cost }],
      );
      return { ok: true, value: cost, character: await commit(next) };
    },

    async drinkPotion(stat) {
      const character = active();
      const potion = potionFor(stat, bracketForCharacter(character).index);
      if (character.currencies.gold < potion.price) return { ok: false, reason: 'notEnoughGold' };

      const next = withQuests(
        {
          ...spendGold(character, potion.price),
          potions: drink(character.potions, potion, clock().now()),
        },
        [{ kind: 'potionDrunk' }, { kind: 'goldSpent', amount: potion.price }],
      );
      return { ok: true, value: potion.price, character: await commit(next) };
    },

    async visitQuests() {
      const character = active();
      const next = withQuests(character, []);
      return next === character ? character : commit(next);
    },

    async claimQuest(cadence, index) {
      const character = withQuests(active(), []);
      const quest = character.quests[cadence].quests[index];
      if (!quest || !isClaimable(quest)) return { ok: false, reason: 'notClaimable' };

      // Marked claimed *and* paid in one step: a claim that banked the reward
      // without flagging the quest would pay out again on the next press.
      const claimed = markClaimed(character.quests, cadence, index);
      const granted = grantReward({ ...character, quests: claimed }, quest.reward);
      return {
        ok: true,
        value: claimableCount(claimed),
        character: await commit(granted.character),
      };
    },

    async toggleCurse(id) {
      const result = toggleCurse(active(), id);
      if (typeof result === 'string') return { ok: false, reason: result };
      return { ok: true, value: undefined, character: await commit(result) };
    },

    async setWishlist(slot) {
      const character = active();
      if (slot !== null && !availableSlots(character.progression.ascension).includes(slot)) {
        return { ok: false, reason: 'slotLocked' };
      }
      return {
        ok: true,
        value: undefined,
        character: await commit({ ...character, wishlist: slot }),
      };
    },

    async buyUpgrade(id) {
      const character = active();
      const account = store.get().account;
      if (!account) return { ok: false, reason: 'noCharacter' };

      const outcome = buyUpgrade(account, character, id);
      if (outcome === 'maxed') return { ok: false, reason: 'maxed' };
      if (outcome === 'notEnoughGold') return { ok: false, reason: 'notEnoughGold' };

      // The account and the purse change together, or a reload would hand the
      // upgrade over for free.
      await save.saveAccount(outcome.account);
      accountLoaded(store, outcome.account);
      const paid = withQuests(outcome.character, [{ kind: 'goldSpent', amount: outcome.cost }]);
      return { ok: true, value: outcome.cost, character: await commit(paid) };
    },

    async pullBanner(banner) {
      const character = active();
      const refusal = canPull(character, banner, capacity());
      if (refusal !== true) {
        return { ok: false, reason: refusal === 'noCurrency' ? 'noCurrency' : 'backpackFull' };
      }

      const result = pull({
        character,
        banner,
        bracket: bracketForCharacter(character),
        // The pull count is the stream name, so it has to be the count *before*
        // this pull — and it has to move even when the payout was gold, or the
        // next pull would replay this one (ARCHITECTURE §5).
        pullNumber: character.gachaPulls,
      });

      const spent = spendCurrency(character, banner);
      const granted = grantReward(
        { ...spent, gachaPulls: spent.gachaPulls + 1 },
        { ...result.reward, items: result.item ? [result.item] : [] },
      );
      const events: QuestEvent[] =
        result.reward.gold > 0 ? [{ kind: 'goldEarned', amount: result.reward.gold }] : [];

      return {
        ok: true,
        value: result,
        character: await commit(withQuests(granted.character, events)),
      };
    },

    async finishTutorial(rewarded) {
      const account = store.get().account;
      if (account && !account.tutorialCompleted) {
        const done = { ...account, tutorialCompleted: true };
        await save.saveAccount(done);
        accountLoaded(store, done);
      }
      if (!rewarded) return;

      const granted = grantReward(active(), {
        gold: TUTORIAL_REWARD.gold,
        xp: 0,
        materials: {},
        items: [],
        tickets: 0,
        luckyTickets: TUTORIAL_REWARD.luckyTickets,
      });
      await commit(granted.character);
    },
  };
}

export type { SlotId };

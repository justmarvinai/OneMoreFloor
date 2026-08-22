/**
 * The session — the seam between the save layer and the state tree.
 *
 * Screens call these actions; they never touch IndexedDB and never write to the
 * store themselves. Each action does the same three things in the same order:
 * change the persisted truth, then the in-memory truth, then let the UI notice
 * through its subscriptions.
 */
import { createAccount, afterCharacterReset, setActiveSlot } from '@/domain/character/account.ts';
import { createCharacter, summarize } from '@/domain/character/character.ts';
import { checkName, type NameProblem } from '@/domain/character/naming.ts';
import {
  SLOT_IDS,
  type Account,
  type Character,
  type ClassId,
  type SlotId,
} from '@/domain/character/types.ts';
import {
  fightFloor,
  quickRaid,
  type FloorResult,
  type QuickRaidResult,
} from '@/domain/tower/run.ts';
import type { SaveLayer } from '@/save/saveLayer.ts';
import { newSeed } from './rng.ts';
import {
  accountLoaded,
  characterEntered,
  characterLeft,
  slotsLoaded,
  takenNames,
  type AppStore,
  type SlotView,
} from './state.ts';
import { clock } from './time.ts';

export interface Session {
  /** Read the account and every slot into the store. Safe to call again. */
  refresh(): Promise<void>;
  createHero(input: { slotId: SlotId; name: string; classId: ClassId }): Promise<CreateResult>;
  /** Enter a slot and make it the active character (Q2). */
  play(slotId: SlotId): Promise<boolean>;
  /** Leave the active character and return to the select screen. */
  leave(): Promise<void>;
  /** Erase one slot completely (Brief §19). Account upgrades survive (Q4). */
  reset(slotId: SlotId): Promise<void>;
  /**
   * Fight one floor. The fight resolves and its consequences are **saved before
   * the animation starts** (COMBAT.md §1): a tab that dies mid-fight loses the
   * choreography, never the outcome.
   */
  fight(floor: number): Promise<FloorResult>;
  /** Quick-Raid through cleared floors, saving the aggregate result (Q8). */
  raid(throughFloor: number): Promise<QuickRaidResult>;
}

export type CreateResult = { ok: true } | { ok: false; problem: NameProblem | 'slotUnavailable' };

export function createSession(save: SaveLayer, store: AppStore): Session {
  async function loadAccount(): Promise<Account> {
    const loaded = await save.loadAccount();
    if (loaded.record) return loaded.record.account;

    // No account yet (a first run), or none that could be recovered. Either way
    // the game needs one to function; the character records are untouched, so a
    // damaged account costs the player their upgrades, not their heroes.
    const account = createAccount();
    await save.saveAccount(account);
    return account;
  }

  async function readSlots(account: Account): Promise<SlotView[]> {
    const loaded = await save.loadAllCharacters();

    return SLOT_IDS.map((slotId) => {
      const result = loaded.get(slotId);
      const record = result?.record;

      if (record) {
        return { slotId, state: 'occupied' as const, summary: summarize(record.character) };
      }
      if (result?.status === 'corrupt') {
        return { slotId, state: 'damaged' as const, summary: null };
      }
      return {
        slotId,
        state: slotId > account.slotsUnlocked ? ('locked' as const) : ('empty' as const),
        summary: null,
      };
    });
  }

  async function refresh(): Promise<void> {
    const account = await loadAccount();
    accountLoaded(store, account);
    slotsLoaded(store, await readSlots(account));
  }

  return {
    refresh,

    async createHero({ slotId, name, classId }) {
      const state = store.get();
      const account = state.account ?? (await loadAccount());

      const slot = state.slots.find((entry) => entry.slotId === slotId);
      if (!slot || slot.state !== 'empty') return { ok: false, problem: 'slotUnavailable' };

      const check = checkName(name, takenNames(state));
      if (!check.ok) return { ok: false, problem: check.problem ?? 'empty' };

      const character = createCharacter({
        slotId,
        name,
        classId,
        createdAt: clock().now(),
        runSeed: newSeed(`run:${slotId}`),
      });

      // The character and the account's active slot are written together: a hero
      // nobody is playing would be as broken as an account pointing at nothing.
      const withActive = setActiveSlot(account, slotId);
      await save.createCharacter(character, withActive);

      accountLoaded(store, withActive);
      slotsLoaded(store, await readSlots(withActive));
      characterEntered(store, character);
      return { ok: true };
    },

    async play(slotId) {
      const loaded = await save.loadCharacter(slotId);
      if (!loaded.record) {
        // The slot turned out to be unreadable — refresh so the screen shows it
        // as damaged rather than silently doing nothing.
        await refresh();
        return false;
      }

      const account = setActiveSlot(store.get().account ?? (await loadAccount()), slotId);
      await save.saveAccount(account);

      accountLoaded(store, account);
      characterEntered(store, loaded.record.character);
      return true;
    },

    async leave() {
      const account = store.get().account;
      if (account) {
        const cleared = setActiveSlot(account, null);
        await save.saveAccount(cleared);
        accountLoaded(store, cleared);
      }
      characterLeft(store);
      await refresh();
    },

    async reset(slotId) {
      const account = store.get().account ?? (await loadAccount());
      const next = afterCharacterReset(account, slotId);

      // The save layer backs the record up before removing it, so an accidental
      // reset is still recoverable within the retention window even though the
      // UI treats it as final (SAVE_SCHEMA §9).
      await save.deleteCharacter(slotId, next);

      accountLoaded(store, next);
      characterLeft(store);
      slotsLoaded(store, await readSlots(next));
    },

    async fight(floor) {
      const character = requireActive(store);
      const result = fightFloor(character, floor);
      await commit(result.character);
      return result;
    },

    async raid(throughFloor) {
      const character = requireActive(store);
      const result = quickRaid(character, throughFloor);
      await commit(result.character);
      return result;
    },
  };

  /**
   * Persist the character, then let the store notice — in that order. Writing
   * first is what makes a fight's result survive a crash between resolution and
   * the screen that shows it (SAVE_SCHEMA §5, COMBAT.md §1).
   */
  async function commit(character: Character): Promise<void> {
    await save.saveCharacter(character);
    characterEntered(store, character);
  }
}

/** A fight without a character loaded is a programming error, not a player one. */
function requireActive(store: AppStore): Character {
  const character = store.get().activeCharacter;
  if (!character) throw new Error('[session] no active character');
  return character;
}

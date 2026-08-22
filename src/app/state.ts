/**
 * The application state tree and the actions that change it.
 *
 * The tree grows one slice per milestone. What it holds now is the character
 * lifecycle: which account this is, what is in each of the five slots, and who
 * is being played — exactly one at a time (Q2).
 *
 * The rule that keeps this honest: **UI never writes to the tree, only calls
 * actions.** Every mutation in the game is a function in a file like this one.
 */
import type { Account, Character, SlotId } from '@/domain/character/types.ts';
import type { CharacterSummary } from '@/domain/character/character.ts';
import type { SlotState } from '@/domain/character/account.ts';
import { createStore, type Store } from './store.ts';
import type { LoadStatus } from '@/save/saveLayer.ts';

export interface SaveState {
  status: LoadStatus;
  createdAt: number;
  lastOpenedAt: number;
  /** When the restored backup was taken, for a `recovered` load. */
  recoveredFrom?: number;
}

/**
 * A slot as the select screen sees it. `damaged` is its own state rather than
 * being folded into `empty`: an unreadable character must never look like a free
 * slot the player can build over (SAVE_SCHEMA §6).
 */
export interface SlotView {
  slotId: SlotId;
  state: SlotState | 'damaged';
  summary: CharacterSummary | null;
}

export interface AppState {
  save: SaveState | null;
  account: Account | null;
  slots: SlotView[];
  /** The character being played, or null while choosing one. */
  activeCharacter: Character | null;
}

export const initialAppState: AppState = {
  save: null,
  account: null,
  slots: [],
  activeCharacter: null,
};

export type AppStore = Store<AppState>;

export function createAppStore(initial: AppState = initialAppState): AppStore {
  return createStore(initial);
}

export function saveLoaded(store: AppStore, save: SaveState): void {
  store.update((state) => ({ ...state, save }));
}

export function accountLoaded(store: AppStore, account: Account): void {
  store.update((state) => ({ ...state, account }));
}

export function slotsLoaded(store: AppStore, slots: SlotView[]): void {
  store.update((state) => ({ ...state, slots }));
}

export function characterEntered(store: AppStore, character: Character): void {
  store.update((state) => ({ ...state, activeCharacter: character }));
}

export function characterLeft(store: AppStore): void {
  store.update((state) => ({ ...state, activeCharacter: null }));
}

/** The names already in use, for the uniqueness rule in hero creation (Q25). */
export function takenNames(state: AppState): string[] {
  return state.slots
    .map((slot) => slot.summary?.name)
    .filter((name): name is string => typeof name === 'string');
}

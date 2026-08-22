/**
 * The application state tree and the actions that change it.
 *
 * The tree is deliberately small at M0 — it holds what the foundation build
 * actually knows: how the save came back, and when this installation started.
 * Character, tower, economy and quest slices land in their own milestones, each
 * added here as a named slice with its own actions (ARCHITECTURE §3).
 *
 * The rule that keeps this honest: **UI never writes to the tree, only calls
 * actions.** Every mutation in the game is a function in a file like this one.
 */
import { createStore, type Store } from './store.ts';
import type { LoadStatus } from '@/save/saveLayer.ts';

export interface SaveState {
  status: LoadStatus;
  createdAt: number;
  lastOpenedAt: number;
}

export interface AppState {
  /** Null until the save layer has reported in. */
  save: SaveState | null;
}

export const initialAppState: AppState = {
  save: null,
};

export type AppStore = Store<AppState>;

export function createAppStore(initial: AppState = initialAppState): AppStore {
  return createStore(initial);
}

export function saveLoaded(store: AppStore, save: SaveState): void {
  store.update((state) => ({ ...state, save }));
}

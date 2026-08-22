/**
 * The state store.
 *
 * Deliberately tiny (ARCHITECTURE §2): one state tree, replaced by pure updater
 * functions, with slice subscriptions so a screen re-renders only the part that
 * actually changed. The game is event-driven rather than per-frame, so there is
 * nothing here for a reactivity system to buy us.
 *
 * The rule that makes this safe to grow: **UI mutates state only through actions**
 * (functions that call `store.update`), never by writing to the tree it reads.
 */

export type Updater<S> = (state: S) => S;
export type Listener<T> = (value: T, previous: T) => void;
export type Selector<S, T> = (state: S) => T;

export interface Store<S> {
  /** The current state tree. Treat it as immutable. */
  get(): S;
  /** Replace the tree with `updater(state)`. Listeners fire if the value changed. */
  update(updater: Updater<S>): void;
  /** Subscribe to the whole tree. Returns an unsubscribe function. */
  subscribe(listener: Listener<S>): () => void;
  /**
   * Subscribe to one slice. The listener fires only when the selected value
   * changes (by `Object.is`), which is what keeps badge counters and stat rows
   * from re-rendering on every unrelated update.
   */
  select<T>(selector: Selector<S, T>, listener: Listener<T>): () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<Listener<S>>();
  let notifying = false;

  const notify = (previous: S): void => {
    // Guard against a listener updating the store re-entrantly: the outer loop
    // would then deliver states out of order. Nested updates still apply — they
    // simply notify on their own pass.
    if (notifying) return;
    notifying = true;
    try {
      for (const listener of [...listeners]) listener(state, previous);
    } finally {
      notifying = false;
    }
  };

  return {
    get: () => state,

    update(updater) {
      const previous = state;
      const next = updater(previous);
      if (Object.is(next, previous)) return;
      state = next;
      notify(previous);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    select(selector, listener) {
      let previousSlice = selector(state);
      const wrapped: Listener<S> = (next) => {
        const nextSlice = selector(next);
        if (Object.is(nextSlice, previousSlice)) return;
        const before = previousSlice;
        previousSlice = nextSlice;
        listener(nextSlice, before);
      };
      listeners.add(wrapped);
      return () => listeners.delete(wrapped);
    },
  };
}

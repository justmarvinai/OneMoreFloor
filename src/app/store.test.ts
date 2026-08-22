import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store.ts';

interface TestState {
  gold: number;
  floor: number;
}

const initial: TestState = { gold: 0, floor: 1 };

describe('createStore', () => {
  it('exposes the current state', () => {
    expect(createStore(initial).get()).toEqual({ gold: 0, floor: 1 });
  });

  it('replaces state through an updater and notifies subscribers', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((state) => ({ ...state, gold: 100 }));

    expect(store.get()).toEqual({ gold: 100, floor: 1 });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ gold: 100, floor: 1 }, { gold: 0, floor: 1 });
  });

  it('does not notify when the updater returns the same tree', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((state) => state);

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes cleanly', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    const off = store.subscribe(listener);

    off();
    store.update((state) => ({ ...state, gold: 5 }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('select() fires only when the chosen slice changes', () => {
    const store = createStore(initial);
    const onGold = vi.fn();
    store.select((state) => state.gold, onGold);

    store.update((state) => ({ ...state, floor: 2 }));
    expect(onGold).not.toHaveBeenCalled();

    store.update((state) => ({ ...state, gold: 50 }));
    expect(onGold).toHaveBeenCalledExactlyOnceWith(50, 0);
  });

  it('select() reports the previous slice value', () => {
    const store = createStore(initial);
    const seen: Array<[number, number]> = [];
    store.select(
      (state) => state.gold,
      (next, previous) => seen.push([next, previous]),
    );

    store.update((state) => ({ ...state, gold: 10 }));
    store.update((state) => ({ ...state, gold: 25 }));

    expect(seen).toEqual([
      [10, 0],
      [25, 10],
    ]);
  });

  it('survives a subscriber that unsubscribes during notification', () => {
    const store = createStore(initial);
    const second = vi.fn();
    const off = store.subscribe(() => off());
    store.subscribe(second);

    expect(() => store.update((state) => ({ ...state, gold: 1 }))).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
  });

  it('applies a nested update without losing it', () => {
    const store = createStore(initial);
    let reentered = false;
    store.subscribe((state) => {
      if (!reentered && state.gold === 1) {
        reentered = true;
        store.update((current) => ({ ...current, floor: 99 }));
      }
    });

    store.update((state) => ({ ...state, gold: 1 }));

    expect(store.get()).toEqual({ gold: 1, floor: 99 });
  });
});

/**
 * Screen router.
 *
 * Screens follow FantasyUI's lifecycle contract: constructed on enter, `destroy()`d
 * on exit, with every listener and timer released in between. A leaked listener is
 * a defect (CLAUDE.md), so the router is the single place that owns the swap — no
 * screen tears down another.
 */

/** Anything the router can show. FantasyUI components satisfy this shape already. */
export interface Screen {
  readonly el: HTMLElement;
  destroy(): void;
}

export type ScreenFactory = () => Screen;

export interface RouterOptions<Id extends string> {
  /** Element the active screen is mounted into. Cleared on every transition. */
  mount: HTMLElement;
  routes: Readonly<Record<Id, ScreenFactory>>;
  /**
   * Called when constructing a screen throws. The router has already torn the
   * previous screen down by then, so the handler owns what the player sees next
   * (a styled in-game error panel — never a blank page).
   */
  onError?: (error: unknown, id: Id) => void;
  /**
   * Called after a screen is mounted. For anything that has to run *over* a
   * live screen rather than instead of it — the tutorial tour points at real
   * UI, so it cannot start until that UI exists (Brief §18).
   */
  onEnter?: (id: Id) => void;
}

export interface Router<Id extends string> {
  /** Tear down the active screen and enter `id`. Re-entering rebuilds the screen. */
  go(id: Id): void;
  /** The active screen id, or null before the first `go`. */
  current(): Id | null;
  /** Tear down the active screen. Used on shutdown. */
  destroy(): void;
}

export function createRouter<Id extends string>(options: RouterOptions<Id>): Router<Id> {
  const { mount, routes, onError, onEnter } = options;
  let activeId: Id | null = null;
  let active: Screen | null = null;

  const teardown = (): void => {
    if (active) {
      active.destroy();
      active = null;
    }
    activeId = null;
    mount.replaceChildren();
  };

  return {
    go(id) {
      const factory = routes[id];
      if (!factory) throw new Error(`[router] no screen registered for "${id}"`);

      teardown();

      try {
        const screen = factory();
        active = screen;
        activeId = id;
        mount.appendChild(screen.el);
        onEnter?.(id);
      } catch (error) {
        if (onError) {
          onError(error, id);
          return;
        }
        throw error;
      }
    },

    current: () => activeId,
    destroy: teardown,
  };
}

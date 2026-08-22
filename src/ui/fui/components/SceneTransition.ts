import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface SceneTransitionOptions extends BaseOptions {
  /** How the screen is hidden. */
  variant?: 'curtain' | 'iris' | 'fade' | 'wipe' | 'gate';
  /** Milliseconds for one half of the transition. */
  duration?: number;
  /** Background art asset id painted on the covering panels. */
  art?: string;
  /** Colour behind the art. */
  color?: string;
  /** Line shown while the screen is covered — a loading hint or a lore tag. */
  text?: string;
  /** Start covered instead of open. */
  covered?: boolean;
  /** Position over the whole viewport rather than the nearest positioned box. */
  fullscreen?: boolean;
}

/**
 * The wipe between two screens — curtains closing, an iris shutting, a stone
 * gate dropping. `LoadingScreen` is what you show *during* a long load; this is
 * the half-second that hides the swap either side of it.
 *
 *   const wipe = new SceneTransition({ variant: 'gate', art: 'bg-tile-sm', text: 'Entering the Vale' });
 *   await wipe.play(() => router.go('/battle'));
 *
 * `play()` covers the screen, runs your swap while nothing is visible, then
 * reveals — so the callback can do anything, including work that would flash.
 * Every promise resolves off a single `transitionend` guarded by a timeout, so
 * a dropped event can never leave the screen covered forever.
 */
export class SceneTransition extends FuiComponent<SceneTransitionOptions> {
  private isCovered: boolean;
  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: SceneTransitionOptions = {}) {
    const ms = opts.duration ?? 420;
    const root = h('div', {
      class: 'fui fui-wipe',
      dataset: {
        variant: opts.variant ?? 'curtain',
        state: opts.covered ? 'covered' : 'open',
        full: String(!!opts.fullscreen),
      },
      style: {
        '--fui-wipe-ms': `${ms}ms`,
        ...(opts.art ? { '--fui-wipe-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.color ? { '--fui-wipe-ink': opts.color } : {}),
      },
      attrs: { 'aria-hidden': 'true' },
    });
    super(root, opts);
    this.isCovered = !!opts.covered;

    // Two panels for every variant: `iris` and `fade` simply overlap them.
    root.appendChild(h('span', { class: 'fui-wipe__panel fui-wipe__panel--a' }));
    root.appendChild(h('span', { class: 'fui-wipe__panel fui-wipe__panel--b' }));

    if (opts.text) {
      root.appendChild(h('p', { class: 'fui-wipe__text fui-title', text: opts.text }));
    }

    this.onDestroy(() => this.cancel());
  }

  /** True while the screen is hidden. */
  get covered(): boolean {
    return this.isCovered;
  }

  /** Close over the screen. Resolves once nothing behind it is visible. */
  cover(): Promise<void> {
    return this.to('covered');
  }

  /** Open back up. Resolves once the panels are clear of the screen. */
  reveal(): Promise<void> {
    return this.to('open');
  }

  /**
   * Cover, run `swap` while the screen is hidden, then reveal. The swap may be
   * async — a fetch, a route change, a level load — and is awaited before the
   * panels open.
   */
  async play(swap?: () => void | Promise<void>): Promise<void> {
    await this.cover();
    try {
      await swap?.();
    } finally {
      await this.reveal();
    }
  }

  /** Stop any transition in flight. Called on destroy. */
  cancel(): this {
    if (this.pending) clearTimeout(this.pending);
    this.pending = null;
    return this;
  }

  private to(state: 'covered' | 'open'): Promise<void> {
    this.cancel();
    const already = this.isCovered === (state === 'covered');
    this.isCovered = state === 'covered';
    this.el.dataset.state = state;
    this.emit(state === 'covered' ? 'wipe:cover' : 'wipe:reveal');
    if (already) return Promise.resolve();

    // A `transitionend` that never fires — an off-screen element, a tab in the
    // background, `prefers-reduced-motion` — would strand the screen behind the
    // panels, so the timer is the source of truth and the event only shortens
    // the wait.
    const ms = this.opts.duration ?? 420;
    return new Promise((resolve) => {
      const done = () => {
        this.el.removeEventListener('transitionend', done);
        this.cancel();
        this.emit(state === 'covered' ? 'wipe:covered' : 'wipe:open');
        resolve();
      };
      this.el.addEventListener('transitionend', done, { once: true });
      this.pending = setTimeout(done, ms + 40);
    });
  }
}

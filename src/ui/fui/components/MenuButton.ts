import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface MenuButtonOptions extends BaseOptions {
  /** The destination — `'Campaign'`, `'Arena'`, `'Guild'`. */
  label: string;
  /** One line under it: what is waiting there. */
  note?: string;
  /** Glyph asset id for the emblem on the left. */
  glyph?: string;
  /** Painted icon asset id, if you would rather have art than a tinted glyph. */
  art?: string;
  /** Count badge — unclaimed rewards, pending mail. */
  badge?: number | string;
  /** Draw a plain dot instead of a count. */
  dot?: boolean;
  /** Locked: prints `requirement` instead of the note and refuses the press. */
  locked?: boolean;
  /** Why it is locked, e.g. `'Clear Chapter 3'`. */
  requirement?: string;
  /** The one the player is on now. */
  current?: boolean;
  /** Width in pixels, or any CSS length. */
  width?: number | string;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * A main-menu row: emblem, destination, what is waiting there, and a badge for
 * anything unclaimed. `MainMenu` is a whole screen of these; this is one, for
 * a hub, a drawer, a pause menu or a custom layout.
 *
 *   const arena = new MenuButton({
 *     label: 'Arena', note: '3 free entries left', glyph: 'glyph-crossed-swords',
 *     badge: 3, width: 300,
 *   });
 *   arena.on('menu:go', () => router.go('/arena'));
 *
 * A locked row stays in the menu and swaps its note for the requirement, which
 * is the point: a hub that hides what you have not unlocked gives a new player
 * nothing to aim at. The press is refused at the component rather than by the
 * caller, so a locked destination cannot be navigated to by a handler that
 * forgot to check — and `menu:locked` fires instead, carrying the requirement
 * for whatever the game wants to say about it.
 */
export class MenuButton extends FuiComponent<MenuButtonOptions> {
  private noteEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;

  constructor(opts: MenuButtonOptions) {
    const root = h('button', {
      class: 'fui fui-menubtn',
      dataset: {
        locked: opts.locked ? 'on' : 'off',
        current: opts.current ? 'on' : 'off',
      },
      style: {
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
      attrs: {
        type: 'button',
        'aria-label': opts.locked ? `${opts.label} — locked` : opts.label,
        'aria-current': opts.current ? 'page' : undefined,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-menubtn__art', attrs: { 'aria-hidden': 'true' } }));

    const emblem = h('span', { class: 'fui-menubtn__emblem', attrs: { 'aria-hidden': 'true' } });
    if (opts.glyph) {
      emblem.appendChild(
        h('span', {
          class: 'fui-menubtn__glyph',
          style: { '--fui-menu-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    } else if (opts.art) {
      emblem.appendChild(
        h('span', {
          class: 'fui-menubtn__icon',
          style: { '--fui-menu-art': `var(--fui-img-${opts.art})` },
        }),
      );
    }
    root.appendChild(emblem);

    const stack = h('span', { class: 'fui-menubtn__stack' });
    stack.appendChild(h('span', { class: 'fui-menubtn__label', text: opts.label }));
    const note = opts.locked ? (opts.requirement ?? 'Locked') : opts.note;
    if (note) {
      this.noteEl = h('span', { class: 'fui-menubtn__note', text: note });
      stack.appendChild(this.noteEl);
    }
    root.appendChild(stack);

    if (opts.badge != null || opts.dot) {
      this.badgeEl = h('span', {
        class: 'fui-menubtn__badge',
        dataset: { dot: opts.dot ? 'on' : 'off' },
        text: opts.dot ? '' : String(opts.badge),
      });
      root.appendChild(this.badgeEl);
    }

    root.appendChild(h('span', { class: 'fui-menubtn__chevron', attrs: { 'aria-hidden': 'true' } }));

    root.addEventListener('click', (ev) => {
      if (this.opts.locked) {
        ev.stopImmediatePropagation();
        this.emit('menu:locked', this.opts.requirement);
        return;
      }
      this.emit('menu:go', this.opts.label);
    });
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Unlock it, optionally with a fresh note. */
  unlock(note?: string): this {
    this.opts.locked = false;
    this.el.dataset.locked = 'off';
    this.el.setAttribute('aria-label', this.opts.label);
    if (this.noteEl) this.noteEl.textContent = note ?? this.opts.note ?? '';
    return this;
  }

  /** Set or clear the badge. */
  setBadge(badge: number | string | null): this {
    if (badge == null || badge === 0 || badge === '') {
      this.badgeEl?.remove();
      this.badgeEl = null;
      return this;
    }
    if (!this.badgeEl) {
      this.badgeEl = h('span', { class: 'fui-menubtn__badge', dataset: { dot: 'off' } });
      this.el.insertBefore(this.badgeEl, this.el.querySelector('.fui-menubtn__chevron'));
    }
    this.badgeEl.dataset.dot = 'off';
    this.badgeEl.textContent = String(badge);
    return this;
  }

  /** Mark this as the destination the player is currently on. */
  setCurrent(current: boolean): this {
    this.opts.current = current;
    this.el.dataset.current = current ? 'on' : 'off';
    if (current) this.el.setAttribute('aria-current', 'page');
    else this.el.removeAttribute('aria-current');
    return this;
  }
}

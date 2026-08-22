import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface SplitAction {
  id: string;
  label: string;
  /** Glyph asset id for the row. */
  glyph?: string;
  /** Small line under the label — a cost, a count, a warning. */
  note?: string;
  /** Greyed out and unpressable. */
  disabled?: boolean;
}

export interface SplitButtonOptions extends BaseOptions {
  /** The action the big half performs. */
  primary: SplitAction;
  /** Everything behind the caret. */
  actions: SplitAction[];
  /** Glyph asset id in the primary half. */
  glyph?: string;
  /** Stretch to the container's width. */
  block?: boolean;
  /** Which side the menu opens from. */
  align?: 'left' | 'right';
  /** Open the menu upward — for a button pinned to the bottom of a screen. */
  up?: boolean;
  /** Greyed out and unpressable, both halves. */
  disabled?: boolean;
}

/**
 * One button with a second half: the common action on the left, its variants
 * behind a caret on the right. Use ×1 / Use ×10 / Use all; Sell / Sell duplicates;
 * Battle / Battle ×3 / Auto-battle.
 *
 *   const use = new SplitButton({
 *     primary: { id: 'use1', label: 'Use', glyph: 'glyph-health-potion' },
 *     actions: [
 *       { id: 'use10', label: 'Use ×10', note: 'You have 24' },
 *       { id: 'useall', label: 'Use all', note: 'Cannot be undone' },
 *     ],
 *   });
 *   use.on<SplitAction>('split:action', (a) => inventory.consume(a.id));
 *
 * Both halves emit the same `split:action` event with the chosen action, so a
 * caller writes one handler and switches on the id — pressing the big half is
 * exactly "chose the primary". That is the whole point of the shape: the common
 * case stays one tap while the variants stop crowding the screen.
 *
 * The menu closes on outside click, on Escape and on choosing, and all three
 * listeners are registered for teardown; a menu that survives its button is the
 * classic leak in this pattern.
 */
export class SplitButton extends FuiComponent<SplitButtonOptions> {
  private menu: HTMLElement;
  private caret: HTMLButtonElement;
  private open = false;

  constructor(opts: SplitButtonOptions) {
    const root = h('div', {
      class: 'fui fui-splitbtn',
      dataset: { align: opts.align ?? 'left', up: opts.up ? 'on' : 'off', open: 'off' },
    });
    if (opts.block) root.classList.add('fui-splitbtn--block');
    super(root, opts);

    // ── Primary half ──
    const main = h('button', {
      class: 'fui-splitbtn__main',
      attrs: { type: 'button', disabled: opts.disabled || opts.primary.disabled },
    });
    main.appendChild(h('span', { class: 'fui-splitbtn__art', attrs: { 'aria-hidden': 'true' } }));
    const face = h('span', { class: 'fui-splitbtn__face' });
    if (opts.glyph ?? opts.primary.glyph) {
      face.appendChild(
        h('span', {
          class: 'fui-splitbtn__glyph',
          style: { '--fui-split-glyph': `var(--fui-img-${opts.glyph ?? opts.primary.glyph})` },
        }),
      );
    }
    face.appendChild(h('span', { class: 'fui-splitbtn__label', text: opts.primary.label }));
    main.appendChild(face);
    main.addEventListener('click', () => this.choose(opts.primary));
    root.appendChild(main);

    // ── Caret half ──
    this.caret = h('button', {
      class: 'fui-splitbtn__caret',
      attrs: {
        type: 'button',
        disabled: opts.disabled,
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        'aria-label': `More ${opts.primary.label.toLowerCase()} options`,
      },
    });
    this.caret.appendChild(h('span', { class: 'fui-splitbtn__art', attrs: { 'aria-hidden': 'true' } }));
    this.caret.appendChild(h('span', { class: 'fui-splitbtn__chevron', attrs: { 'aria-hidden': 'true' } }));
    this.caret.addEventListener('click', () => this.toggle());
    root.appendChild(this.caret);

    // ── Menu ──
    this.menu = h('div', { class: 'fui-splitbtn__menu', attrs: { role: 'menu' } });
    root.appendChild(this.menu);
    this.build();

    const onDocClick = (ev: Event) => {
      if (this.open && !root.contains(ev.target as Node)) this.close();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && this.open) {
        this.close();
        this.caret.focus();
      }
    };
    const doc = root.ownerDocument;
    doc.addEventListener('click', onDocClick);
    doc.addEventListener('keydown', onKey as EventListener);
    this.onDestroy(() => {
      doc.removeEventListener('click', onDocClick);
      doc.removeEventListener('keydown', onKey as EventListener);
    });
  }

  /** Open or close the menu. */
  toggle(): this {
    return this.open ? this.close() : this.openMenu();
  }

  /** Open the menu. */
  openMenu(): this {
    this.open = true;
    this.el.dataset.open = 'on';
    this.caret.setAttribute('aria-expanded', 'true');
    this.emit('split:open');
    return this;
  }

  /** Close the menu. */
  close(): this {
    this.open = false;
    this.el.dataset.open = 'off';
    this.caret.setAttribute('aria-expanded', 'false');
    return this;
  }

  /** Replace the menu's actions. */
  setActions(actions: SplitAction[]): this {
    this.opts.actions = actions;
    this.build();
    return this;
  }

  private choose(action: SplitAction): void {
    if (action.disabled) return;
    this.close();
    this.emit('split:action', action);
  }

  private build(): void {
    clear(this.menu);
    for (const action of this.opts.actions) {
      const row = h('button', {
        class: 'fui-splitbtn__item',
        attrs: { type: 'button', role: 'menuitem', disabled: action.disabled },
      });
      if (action.glyph) {
        row.appendChild(
          h('span', {
            class: 'fui-splitbtn__itemglyph',
            style: { '--fui-split-glyph': `var(--fui-img-${action.glyph})` },
          }),
        );
      }
      const stack = h('span', { class: 'fui-splitbtn__itemstack' });
      stack.appendChild(h('span', { class: 'fui-splitbtn__itemlabel', text: action.label }));
      if (action.note) {
        stack.appendChild(h('span', { class: 'fui-splitbtn__itemnote', text: action.note }));
      }
      row.appendChild(stack);
      row.addEventListener('click', () => this.choose(action));
      this.menu.appendChild(row);
    }
  }
}

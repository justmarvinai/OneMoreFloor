import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialMaskOptions extends BaseOptions {
  /** Heading of the current step. */
  title?: string;
  /** The explanation. */
  body?: string;
  /** Element (or selector) to cut a hole around. */
  target?: Element | string;
  /** Explicit hole, in the mask's own coordinate space. Wins over `target`. */
  rect?: MaskRect;
  /** Shape of the cut-out. */
  shape?: 'rect' | 'circle';
  /** Padding around the target, in pixels. */
  pad?: number;
  /** Which step this is, 1-based. */
  step?: number;
  /** How many steps in total. */
  steps?: number;
  /** Label for the advance button. */
  nextLabel?: string;
  /** Label for the skip button. Omit to hide it. */
  skipLabel?: string;
  /** Let a click on the highlighted element through instead of advancing. */
  passThrough?: boolean;
}

/**
 * The dim-everything-but-this overlay that walks a new player through their
 * first screen. `TutorialTip` points at a thing; this one takes the whole
 * screen away except that thing.
 *
 *   const mask = new TutorialMask({
 *     title: 'Your bag', body: 'Everything you pick up lands here.',
 *     target: '#bag-button', shape: 'circle', pad: 10, step: 2, steps: 5,
 *     skipLabel: 'Skip tutorial',
 *   });
 *   stage.appendChild(mask.el);
 *   mask.on('tutorial:next', () => tour.advance());
 *   mask.on('tutorial:skip', () => tour.abort());
 *
 * The hole is a `box-shadow` with an enormous spread on a transparent element,
 * not four dimming panels: one box, one radius, and a shape that can animate
 * from step to step. `focus()` measures the target against the mask's *own*
 * rect rather than the viewport, so the overlay works inside a transformed
 * demo stage exactly as it does over a whole page — the trap that makes most
 * tutorial overlays land an inch off inside a scaled container.
 */
export class TutorialMask extends FuiComponent<TutorialMaskOptions> {
  private hole: HTMLElement;
  private card: HTMLElement;
  private titleEl: HTMLElement;
  private bodyEl: HTMLElement;
  private countEl: HTMLElement;

  constructor(opts: TutorialMaskOptions = {}) {
    const root = h('div', {
      class: 'fui fui-tutmask',
      dataset: { shape: opts.shape ?? 'rect' },
      attrs: { role: 'dialog', 'aria-modal': 'true' },
    });
    super(root, opts);

    this.hole = h('div', { class: 'fui-tutmask__hole' });
    root.appendChild(this.hole);

    this.card = h('div', { class: 'fui-tutmask__card' });
    this.titleEl = h('h4', { class: 'fui-tutmask__title', text: opts.title ?? '' });
    this.bodyEl = h('p', { class: 'fui-tutmask__body', text: opts.body ?? '' });
    this.card.append(this.titleEl, this.bodyEl);

    const foot = h('div', { class: 'fui-tutmask__foot' });
    this.countEl = h('span', { class: 'fui-tutmask__count fui-num' });
    foot.appendChild(this.countEl);
    if (opts.skipLabel) {
      const skip = h('button', {
        class: 'fui-tutmask__skip',
        attrs: { type: 'button' },
        text: opts.skipLabel,
      });
      skip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.emit('tutorial:skip', this.opts.step);
      });
      foot.appendChild(skip);
    }
    const next = h('button', {
      class: 'fui-tutmask__next',
      attrs: { type: 'button' },
      text: opts.nextLabel ?? 'Got it',
    });
    next.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.next();
    });
    foot.appendChild(next);
    this.card.appendChild(foot);
    root.appendChild(this.card);

    // Clicking the dim advances too — the gesture every player tries first.
    root.addEventListener('click', () => this.next());
    if (opts.passThrough) this.hole.style.pointerEvents = 'none';

    this.paint();
    if (opts.rect) this.focus(opts.rect);
    else if (opts.target) this.deferFocus();
  }

  /** Move the hole and, optionally, rewrite the card. */
  focus(rect: MaskRect, step: Partial<TutorialMaskOptions> = {}): this {
    Object.assign(this.opts, step);
    this.opts.rect = rect;
    const pad = this.opts.pad ?? 8;

    // A circular hole must actually be circular. `border-radius: 50%` over a
    // wide target gives an ellipse that clips the top and bottom of the very
    // thing being pointed at, so square the box to its larger side first and
    // keep it centred on the target.
    let { x, y, width, height } = rect;
    if ((this.opts.shape ?? 'rect') === 'circle') {
      const side = Math.max(width, height);
      x -= (side - width) / 2;
      y -= (side - height) / 2;
      width = side;
      height = side;
    }

    this.hole.style.left = `${x - pad}px`;
    this.hole.style.top = `${y - pad}px`;
    this.hole.style.width = `${width + pad * 2}px`;
    this.hole.style.height = `${height + pad * 2}px`;
    // The card goes below the hole unless that would run off the bottom.
    const below = rect.y + rect.height + pad + 16;
    const room = this.el.getBoundingClientRect().height;
    this.card.dataset.place = room && below > room - 140 ? 'above' : 'below';
    this.card.style.top = this.card.dataset.place === 'above' ? 'auto' : `${below}px`;
    this.card.style.bottom =
      this.card.dataset.place === 'above' ? `${Math.max(16, room - rect.y + pad + 16)}px` : 'auto';
    this.paint();
    return this;
  }

  /** Point at an element, measuring it against the mask's own box. */
  focusElement(target: Element | string, step: Partial<TutorialMaskOptions> = {}): this {
    const node =
      typeof target === 'string' ? this.el.ownerDocument.querySelector(target) : target;
    if (!node) return this;
    const box = node.getBoundingClientRect();
    const mine = this.el.getBoundingClientRect();
    return this.focus(
      { x: box.left - mine.left, y: box.top - mine.top, width: box.width, height: box.height },
      step,
    );
  }

  /** Advance a step. */
  next(): this {
    this.emit('tutorial:next', this.opts.step);
    return this;
  }

  /** Take the overlay down. */
  close(): this {
    this.el.dataset.closed = 'on';
    this.emit('tutorial:close', this.opts.step);
    return this;
  }

  /** Measure after layout — a constructor runs before the DOM has a box. */
  private deferFocus(): void {
    const view = this.el.ownerDocument.defaultView;
    const run = () => {
      if (this.opts.target) this.focusElement(this.opts.target);
    };
    if (view?.requestAnimationFrame) {
      const id = view.requestAnimationFrame(run);
      this.onDestroy(() => view.cancelAnimationFrame(id));
    } else {
      run();
    }
  }

  private paint(): void {
    this.el.dataset.shape = this.opts.shape ?? 'rect';
    this.titleEl.textContent = this.opts.title ?? '';
    this.titleEl.dataset.empty = this.opts.title ? 'off' : 'on';
    this.bodyEl.textContent = this.opts.body ?? '';
    this.bodyEl.dataset.empty = this.opts.body ? 'off' : 'on';
    const has = this.opts.step != null && this.opts.steps != null;
    this.countEl.textContent = has ? `${this.opts.step} of ${this.opts.steps}` : '';
    this.countEl.dataset.empty = has ? 'off' : 'on';
  }
}

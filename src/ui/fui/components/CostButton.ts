import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, commas } from '../core/dom.ts';

export interface CostButtonOptions extends BaseOptions {
  /** What pressing it does — `'Buy'`, `'Revive'`, `'Refresh'`. */
  label: string;
  /** The price. */
  cost: number;
  /** Glyph asset id for the currency. */
  currencyGlyph?: string;
  /** Currency name, used in the shortfall message. */
  currency?: string;
  /** What the player holds. Below `cost` the button refuses and says why. */
  balance?: number;
  /** Struck-through original price. */
  wasCost?: number;
  /** Corner tag — `'-40%'`, `'First time'`. */
  tag?: string;
  /** Free this time: the price is replaced with `'Free'`. */
  free?: boolean;
  /** Stretch to the container's width. */
  block?: boolean;
  /** Size. */
  size?: 'sm' | 'md' | 'lg';
  /** Greyed out and unpressable. */
  disabled?: boolean;
}

/**
 * The purchase button, with the price on it and the arithmetic already done.
 * Every shop, revive prompt, shop-refresh and energy top-up needs this exact
 * control, and every one of them gets the same two things wrong.
 *
 *   const revive = new CostButton({
 *     label: 'Revive', cost: 50, currency: 'gems', currencyGlyph: 'glyph-celestial-body',
 *     balance: 32, size: 'lg',
 *   });
 *   revive.on('cost:buy', () => wallet.spend(50).then(() => battle.revive()));
 *   revive.on<number>('cost:short', (missing) => store.open({ need: missing }));
 *
 * The first thing implementations get wrong is letting the press through and
 * failing on the server; this one checks the balance and refuses, emitting
 * `cost:short` with *how many* are missing — which is exactly the number the
 * top-up sheet needs. The second is hiding the shortfall: the price turns red
 * and the button prints what is missing rather than going quietly grey, because
 * a player who cannot tell why a button is dead assumes the game is broken.
 */
export class CostButton extends FuiComponent<CostButtonOptions> {
  private priceEl: HTMLElement;
  private shortEl: HTMLElement;

  constructor(opts: CostButtonOptions) {
    const root = h('button', {
      class: 'fui fui-costbtn',
      dataset: { size: opts.size ?? 'md', state: 'open' },
      attrs: { type: 'button', disabled: opts.disabled },
    });
    if (opts.block) root.classList.add('fui-costbtn--block');
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-costbtn__art', attrs: { 'aria-hidden': 'true' } }));

    const face = h('span', { class: 'fui-costbtn__face' });
    face.appendChild(h('span', { class: 'fui-costbtn__label', text: opts.label }));

    const price = h('span', { class: 'fui-costbtn__price' });
    if (opts.wasCost != null) {
      price.appendChild(h('span', { class: 'fui-costbtn__was fui-num', text: commas(opts.wasCost) }));
    }
    if (opts.currencyGlyph) {
      price.appendChild(
        h('span', {
          class: 'fui-costbtn__coin',
          style: { '--fui-cost-glyph': `var(--fui-img-${opts.currencyGlyph})` },
        }),
      );
    }
    this.priceEl = h('span', { class: 'fui-costbtn__num fui-num' });
    price.appendChild(this.priceEl);
    face.appendChild(price);
    root.appendChild(face);

    this.shortEl = h('span', { class: 'fui-costbtn__short' });
    root.appendChild(this.shortEl);

    if (opts.tag) root.appendChild(h('span', { class: 'fui-costbtn__tag', text: opts.tag }));

    root.addEventListener('click', (ev) => {
      const missing = this.missing();
      if (missing > 0) {
        ev.stopImmediatePropagation();
        this.el.dataset.refused = 'on';
        void this.el.offsetWidth;
        this.el.dataset.refused = 'off';
        this.emit('cost:short', missing);
        return;
      }
      this.emit('cost:buy', { label: this.opts.label, cost: this.opts.free ? 0 : this.opts.cost });
    });

    this.paint();
  }

  /** Update the purse — the button re-decides whether it can be pressed. */
  setBalance(balance: number): this {
    this.opts.balance = balance;
    this.paint();
    return this;
  }

  /** Change the price, e.g. after a shop refresh raises it. */
  setCost(cost: number, wasCost?: number): this {
    this.opts.cost = cost;
    if (wasCost !== undefined) this.opts.wasCost = wasCost;
    this.paint();
    return this;
  }

  /** How much currency is missing, or 0. */
  missing(): number {
    if (this.opts.free || this.opts.balance == null) return 0;
    return Math.max(0, this.opts.cost - this.opts.balance);
  }

  private paint(): void {
    const missing = this.missing();
    this.priceEl.textContent = this.opts.free ? 'Free' : commas(this.opts.cost);
    this.el.dataset.state = this.opts.free ? 'free' : missing > 0 ? 'short' : 'open';
    this.shortEl.textContent =
      missing > 0 ? `${commas(missing)} ${this.opts.currency ?? 'more'} needed` : '';
    this.shortEl.dataset.empty = missing > 0 ? 'off' : 'on';
    this.el.setAttribute(
      'aria-label',
      missing > 0
        ? `${this.opts.label} — ${commas(missing)} ${this.opts.currency ?? 'more'} needed`
        : `${this.opts.label} for ${this.opts.free ? 'free' : commas(this.opts.cost)}`,
    );
  }
}

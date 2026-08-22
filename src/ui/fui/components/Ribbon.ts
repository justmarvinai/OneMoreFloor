import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, type Child } from '../core/dom.ts';

export type RibbonTone = 'new' | 'sale' | 'event' | 'limited' | 'sold' | 'neutral';

export interface RibbonOptions extends BaseOptions {
  /** The shout — "NEW", "-50%", "EVENT". Kept short on purpose. */
  text: string;
  /** Second line, only drawn by the `banner` variant. */
  note?: string;
  /** Preset colour. `neutral` takes whatever `color` says. */
  tone?: RibbonTone;
  /** Any CSS colour, overriding `tone`. */
  color?: string;
  /** `corner` cuts across a corner, `banner` is a straight strip, `flag` hangs off the edge. */
  variant?: 'corner' | 'banner' | 'flag';
  /** Which corner or edge it sits on. */
  at?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Glyph asset id stamped before the text. */
  glyph?: string;
  /** The card the ribbon is pinned to. Omit to place the ribbon yourself. */
  content?: Child | Child[];
}

/**
 * The corner flash a shop or gacha screen puts over a card — NEW, −50%, SOLD
 * OUT. It wraps whatever it is marking, so nothing about the card underneath
 * has to change:
 *
 *   new Ribbon({
 *     text: '-50%', tone: 'sale', variant: 'corner', at: 'top-right',
 *     content: new OfferCard({ … }).el,
 *   });
 *
 * A corner ribbon is a rotated strip clipped by the wrapper, which is why the
 * wrapper owns `overflow: hidden` and the card does not need to. Pass no
 * `content` and you get the strip alone, ready to drop into a positioned
 * element of your own.
 */
export class Ribbon extends FuiComponent<RibbonOptions> {
  private label: HTMLElement;

  constructor(opts: RibbonOptions) {
    const root = h('div', {
      class: 'fui fui-ribbon',
      dataset: {
        variant: opts.variant ?? 'corner',
        at: opts.at ?? 'top-right',
        tone: opts.tone ?? 'new',
        bare: String(opts.content == null),
      },
      style: opts.color ? { '--fui-ribbon-ink': opts.color } : {},
    });
    super(root, opts);

    if (opts.content != null) {
      const slot = h('div', { class: 'fui-ribbon__content' });
      append(slot, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
      root.appendChild(slot);
    }

    this.label = h('span', { class: 'fui-ribbon__label' });
    if (opts.glyph) {
      this.label.appendChild(
        h('span', {
          class: 'fui-ribbon__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    this.label.appendChild(h('span', { class: 'fui-ribbon__text', text: opts.text }));
    if (opts.note && (opts.variant ?? 'corner') === 'banner') {
      this.label.appendChild(h('span', { class: 'fui-ribbon__note', text: opts.note }));
    }
    root.appendChild(this.label);
  }

  /** Change the shout without rebuilding the card underneath. */
  setText(text: string): this {
    this.opts.text = text;
    const el = this.label.querySelector('.fui-ribbon__text');
    if (el) el.textContent = text;
    return this;
  }

  /** Swap the preset colour, e.g. from `sale` to `sold` when stock runs out. */
  setTone(tone: RibbonTone): this {
    this.opts.tone = tone;
    this.el.dataset.tone = tone;
    return this;
  }
}

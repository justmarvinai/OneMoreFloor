import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, append, type Child } from '../core/dom.ts';

export interface OrnateHeaderOptions extends BaseOptions {
  /** The heading text. Omit it for a bare divider. */
  title: string;
  /** Small line above the title — a chapter number, a category. */
  eyebrow?: string;
  /** Line under the title. */
  subtitle?: string;
  /** Glyph asset id drawn in the centre of the flourish. */
  glyph?: string;
  /**
   * `banner` uses the theme's painted ribbon art, `divider` flanks the title
   * with the ornament pack's dividers, `rule` is a plain engraved line.
   */
  variant?: 'banner' | 'divider' | 'rule';
  /** Which divider shape to flank with, 1–6. `divider` variant only. */
  divider?: number;
  /** Use the faded divider set instead of the solid one. */
  fade?: boolean;
  /** Tint for the ornament. Any CSS colour. */
  tint?: string;
  /** Which way the title sits between the wings. */
  align?: 'left' | 'center';
  /** Title size in pixels. */
  size?: 'sm' | 'md' | 'lg';
  /** Anything to place at the far end — a count, a button. */
  trailing?: Child | Child[];
}

/**
 * A section heading with real ornament, for the top of a panel, a shop
 * department, a chapter break or a settings group.
 *
 *   new OrnateHeader({ title: 'The Ashen Anvil', eyebrow: 'Chapter II', variant: 'divider', divider: 3 });
 *   new OrnateHeader({ title: 'Rewards', variant: 'banner', glyph: 'glyph-trophy-cup' });
 *
 * The `divider` variant mirrors one ornament either side of the title, so the
 * flourish scales with the heading instead of being a fixed-width image dropped
 * above it.
 */
export class OrnateHeader extends FuiComponent<OrnateHeaderOptions> {
  constructor(opts: OrnateHeaderOptions) {
    const n = String(clamp(Math.round(opts.divider ?? 1), 1, 6)).padStart(2, '0');
    const art = `deco-divider${opts.fade ? '-fade' : ''}-${n}`;

    const root = h('div', {
      class: 'fui fui-ohead',
      dataset: {
        variant: opts.variant ?? 'divider',
        align: opts.align ?? 'center',
        size: opts.size ?? 'md',
      },
      style: {
        '--fui-ohead-art': `var(--fui-img-${art})`,
        ...(opts.tint ? { '--fui-ohead-ink': opts.tint } : {}),
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-ohead__wing fui-ohead__wing--l', attrs: { 'aria-hidden': 'true' } }));

    const stack = h('div', { class: 'fui-ohead__stack' });
    if (opts.eyebrow) {
      stack.appendChild(h('span', { class: 'fui-ohead__eyebrow', text: opts.eyebrow }));
    }

    const line = h('div', { class: 'fui-ohead__line' });
    if (opts.glyph) {
      line.appendChild(
        h('span', {
          class: 'fui-ohead__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    line.appendChild(h('h2', { class: 'fui-ohead__title fui-title', text: opts.title }));
    stack.appendChild(line);

    if (opts.subtitle) {
      stack.appendChild(h('span', { class: 'fui-ohead__subtitle', text: opts.subtitle }));
    }
    root.appendChild(stack);

    root.appendChild(h('span', { class: 'fui-ohead__wing fui-ohead__wing--r', attrs: { 'aria-hidden': 'true' } }));

    if (opts.trailing) {
      const tail = h('div', { class: 'fui-ohead__trailing' });
      append(tail, ...(Array.isArray(opts.trailing) ? opts.trailing : [opts.trailing]));
      root.appendChild(tail);
    }
  }
}

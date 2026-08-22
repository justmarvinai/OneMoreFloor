import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, append, type Child } from '../core/dom.ts';

export interface PedestalOptions extends BaseOptions {
  /** What is standing on the plinth — a portrait, a card, anything. */
  content?: Child | Child[];
  /** Manifest asset id shown on the plinth when there is no `content`. */
  art?: string;
  /** Name carved into the plinth face. */
  label?: string;
  /** Line under the name. */
  note?: string;
  /** Tints the light, the ring and the plinth trim. */
  rarity?: Rarity;
  /** Any CSS colour, overriding `rarity`. */
  color?: string;
  /** Height of the display area in pixels. */
  height?: number;
  /** Width in pixels, or any CSS length. */
  width?: number | string;
  /** Turn the spotlight cone off. */
  spotlight?: boolean;
  /** Slowly rotate the ground ring. */
  turning?: boolean;
  /** Motes drifting upward through the light. */
  motes?: number;
  /** `stone` is a carved block, `arcane` is a floating disc, `none` is light only. */
  base?: 'stone' | 'arcane' | 'none';
}

/**
 * The plinth a game stands one thing on so you look at it: a summon result, the
 * hero on the character screen, the relic in a shop's featured slot.
 *
 *   new Pedestal({
 *     art: 'fire-phoenix-rise', label: 'Emberwake', note: 'Legendary · Fire',
 *     rarity: 'legendary', turning: true, motes: 14, height: 300,
 *   });
 *
 * The light is three stacked layers — a cone, a ground pool and a rim glow —
 * all tinted from one custom property, so a rarity change recolours the whole
 * scene rather than just the frame. Motes are laid out from their index alone,
 * with no randomness, so the server and the browser render the same plinth.
 */
export class Pedestal extends FuiComponent<PedestalOptions> {
  readonly stage: HTMLElement;

  constructor(opts: PedestalOptions = {}) {
    const root = h('div', {
      class: 'fui fui-plinth',
      dataset: { base: opts.base ?? 'stone', rarity: opts.rarity ?? 'common' },
      style: {
        '--fui-plinth-h': `${opts.height ?? 260}px`,
        ...(opts.color ? { '--fui-plinth-ink': opts.color } : {}),
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
    });
    super(root, opts);

    if (opts.spotlight ?? true) {
      root.appendChild(h('span', { class: 'fui-plinth__cone', attrs: { 'aria-hidden': 'true' } }));
    }

    this.stage = h('div', { class: 'fui-plinth__stage' });
    if (opts.content != null) {
      append(this.stage, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    } else if (opts.art) {
      this.stage.appendChild(
        h('span', {
          class: 'fui-plinth__art',
          style: { backgroundImage: `var(--fui-img-${opts.art})` },
        }),
      );
    }
    root.appendChild(this.stage);

    if (opts.motes) {
      const field = h('span', { class: 'fui-plinth__motes', attrs: { 'aria-hidden': 'true' } });
      for (let i = 0; i < opts.motes; i++) {
        // Derived from the index, never from Math.random: the pre-rendered
        // markup and the hydrated one have to agree.
        field.appendChild(
          h('span', {
            class: 'fui-plinth__mote',
            style: {
              left: `${(8 + ((i * 37) % 84)).toFixed(1)}%`,
              '--fui-plinth-delay': `${((i * 0.53) % 4).toFixed(2)}s`,
              '--fui-plinth-dur': `${(3.6 + ((i * 0.31) % 2.4)).toFixed(2)}s`,
              '--fui-plinth-mote': `${(2 + (i % 3)).toFixed(0)}px`,
            },
          }),
        );
      }
      root.appendChild(field);
    }

    if ((opts.base ?? 'stone') !== 'none') {
      const plinth = h('div', { class: 'fui-plinth__base' });
      plinth.appendChild(
        h('span', {
          class: 'fui-plinth__ring',
          dataset: { turning: String(!!opts.turning) },
          attrs: { 'aria-hidden': 'true' },
        }),
      );
      plinth.appendChild(h('span', { class: 'fui-plinth__block', attrs: { 'aria-hidden': 'true' } }));
      if (opts.label) {
        const plate = h('div', { class: 'fui-plinth__plate' });
        plate.appendChild(h('span', { class: 'fui-plinth__label fui-title', text: opts.label }));
        if (opts.note) plate.appendChild(h('span', { class: 'fui-plinth__note', text: opts.note }));
        plinth.appendChild(plate);
      }
      root.appendChild(plinth);
    }
  }

  /** Swap what is standing on the plinth. */
  setContent(...kids: Child[]): this {
    while (this.stage.firstChild) this.stage.removeChild(this.stage.firstChild);
    append(this.stage, ...kids);
    return this;
  }

  /** Recolour the light, the ring and the trim in one move. */
  setRarity(rarity: Rarity): this {
    this.opts.rarity = rarity;
    this.el.dataset.rarity = rarity;
    return this;
  }
}

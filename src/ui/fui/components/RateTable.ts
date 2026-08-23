import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface RateRow {
  /** What tier or pool this row covers. */
  label: string;
  /** Chance per pull, as a percentage. */
  rate: number;
  rarity?: Rarity;
  /** Manifest asset id for a sample of the pool. */
  art?: string;
  /** Sub-rows — the individual units inside a tier. */
  items?: Array<{ label: string; rate: number; art?: string; featured?: boolean }>;
  /** This tier is rate-up on the current banner. */
  featured?: boolean;
}

export interface RateTableOptions extends BaseOptions {
  /** One row per pool or tier, in the order they should be read. */
  rows: RateRow[];
  /** Heading over the table. */
  title?: string;
  /** Banner or pool this table describes. */
  subtitle?: string;
  /** Pity rules, printed verbatim under the table. */
  notes?: string[];
  /** Guaranteed-pull counter, e.g. `{ at: 90, label: 'Legendary guaranteed at' }`. */
  pity?: { at: number; done?: number; label?: string };
  /** How many decimal places rates are printed to. */
  precision?: number;
  /** Start with the tier breakdowns open. */
  expanded?: boolean;
}

/**
 * The drop-rate disclosure — the screen a gacha game is required to show in
 * most of the markets it ships in, and which players read more carefully than
 * any other.
 *
 *   new RateTable({
 *     title: 'Drop rates', subtitle: 'Emberwake — rate-up until Sunday',
 *     pity: { at: 90, done: 62, label: 'Legendary guaranteed at' },
 *     notes: ['Rates are per summon and do not change with the number of summons.'],
 *     rows: [
 *       { label: 'Legendary', rate: 0.5, rarity: 'legendary', featured: true,
 *         items: [{ label: 'Emberwake', rate: 0.25, featured: true }] },
 *     ],
 *   });
 *
 * The total is computed from the rows rather than declared, and shown even when
 * it does not reach 100% — a disclosure that quietly rounds itself to look tidy
 * is worse than no disclosure. `total()` is the same number the footer prints.
 */
export class RateTable extends FuiComponent<RateTableOptions> {
  private body: HTMLElement;
  private footer: HTMLElement;

  constructor(opts: RateTableOptions) {
    const root = h('div', { class: 'fui fui-rates' });
    super(root, opts);

    if (opts.title || opts.subtitle) {
      const head = h('div', { class: 'fui-rates__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-rates__title fui-title', text: opts.title }));
      }
      if (opts.subtitle) {
        head.appendChild(h('span', { class: 'fui-rates__subtitle', text: opts.subtitle }));
      }
      root.appendChild(head);
    }

    if (opts.pity) {
      const done = Math.max(0, Math.min(opts.pity.at, opts.pity.done ?? 0));
      const pity = h('div', {
        class: 'fui-rates__pity',
        style: { '--fui-rates-p': (opts.pity.at ? done / opts.pity.at : 0).toFixed(4) },
      });
      pity.appendChild(
        h('span', {
          class: 'fui-rates__pity-label',
          text: opts.pity.label ?? 'Guaranteed at',
        }),
      );
      pity.appendChild(
        h('span', { class: 'fui-rates__pity-count fui-num', text: `${done} / ${opts.pity.at}` }),
      );
      const bar = h('span', { class: 'fui-rates__pity-bar' });
      bar.appendChild(h('span', { class: 'fui-rates__pity-fill' }));
      pity.appendChild(bar);
      root.appendChild(pity);
    }

    this.body = h('div', { class: 'fui-rates__body' });
    root.appendChild(this.body);

    this.footer = h('div', { class: 'fui-rates__footer' });
    root.appendChild(this.footer);

    if (opts.notes?.length) {
      const notes = h('ul', { class: 'fui-rates__notes' });
      for (const n of opts.notes) notes.appendChild(h('li', { text: n }));
      root.appendChild(notes);
    }
    this.paint();
  }

  /** The rates added up. Not rounded to a tidy 100. */
  total(): number {
    return this.opts.rows.reduce((n, r) => n + r.rate, 0);
  }

  /** Replace the pools. */
  setRows(rows: RateRow[]): this {
    this.opts.rows = rows;
    this.paint();
    return this;
  }

  private fmt(n: number): string {
    return `${n.toFixed(this.opts.precision ?? 2)}%`;
  }

  private paint(): void {
    clear(this.body);
    clear(this.footer);

    for (const row of this.opts.rows) {
      const group = h('div', {
        class: 'fui-rates__group',
        dataset: { rarity: row.rarity ?? 'common' },
      });
      const summary = h(row.items?.length ? 'summary' : 'div', { class: 'fui-rates__row' });

      // Every cell is emitted whether or not it has content. Appending art and
      // flags conditionally would shift each following cell one column left,
      // which silently misaligns the bars and rates between rows.
      summary.appendChild(
        h('span', {
          class: 'fui-rates__art',
          style: row.art ? { backgroundImage: `var(--fui-img-${row.art})` } : { visibility: 'hidden' },
        }),
      );
      summary.appendChild(h('span', { class: 'fui-rates__label', text: row.label }));
      summary.appendChild(
        row.featured
          ? h('span', { class: 'fui-rates__flag', text: 'Rate up' })
          : h('span', { class: 'fui-rates__flag-slot' }),
      );
      // The bar makes a 0.5% next to a 74% legible as a ratio rather than as two
      // similar-looking numbers.
      const bar = h('span', { class: 'fui-rates__bar' });
      bar.appendChild(
        h('span', {
          class: 'fui-rates__fill',
          style: { width: `${Math.min(100, row.rate).toFixed(3)}%` },
        }),
      );
      summary.appendChild(bar);
      summary.appendChild(h('span', { class: 'fui-rates__rate fui-num', text: this.fmt(row.rate) }));

      if (row.items?.length) {
        const details = h('details', { class: 'fui-rates__details' });
        if (this.opts.expanded) details.open = true;
        details.appendChild(summary);
        const items = h('div', { class: 'fui-rates__items' });
        for (const item of row.items) {
          const line = h('div', { class: 'fui-rates__item' });
          line.appendChild(
            h('span', {
              class: 'fui-rates__item-art',
              style: item.art
                ? { backgroundImage: `var(--fui-img-${item.art})` }
                : { visibility: 'hidden' },
            }),
          );
          line.appendChild(h('span', { class: 'fui-rates__item-label', text: item.label }));
          line.appendChild(
            item.featured
              ? h('span', { class: 'fui-rates__flag', text: 'Rate up' })
              : h('span', { class: 'fui-rates__flag-slot' }),
          );
          line.appendChild(
            h('span', { class: 'fui-rates__item-rate fui-num', text: this.fmt(item.rate) }),
          );
          items.appendChild(line);
        }
        details.appendChild(items);
        group.appendChild(details);
      } else {
        group.appendChild(summary);
      }
      this.body.appendChild(group);
    }

    const total = this.total();
    this.footer.appendChild(h('span', { class: 'fui-rates__total-label', text: 'Total' }));
    const value = h('span', { class: 'fui-rates__total fui-num', text: this.fmt(total) });
    // Anything but 100 is worth saying out loud rather than hiding.
    if (Math.abs(total - 100) > 0.005) value.classList.add('is-odd');
    this.footer.appendChild(value);
  }
}

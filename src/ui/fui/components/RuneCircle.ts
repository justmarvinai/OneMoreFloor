import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, clamp, type Child } from '../core/dom.ts';

export interface RuneCircleRing {
  /** Fraction of the circle's radius this ring sits at, 0–1. */
  at?: number;
  /** Glyph asset ids placed evenly around the ring. */
  glyphs?: string[];
  /** Runes per ring when no glyphs are given — drawn as tick marks. */
  ticks?: number;
  /** Seconds for one full turn. Negative turns the other way. */
  spin?: number;
  /** Ring colour, overriding the circle's. */
  color?: string;
  /** Draw the ring's own hairline. */
  line?: boolean;
}

export interface RuneCircleOptions extends BaseOptions {
  /** Diameter in pixels. */
  size?: number;
  /** The rings, outermost first. Omit for a sensible three-ring default. */
  rings?: RuneCircleRing[];
  /** Accent colour for the whole circle. */
  color?: string;
  /** What sits at the centre — a portrait, an item, a button. */
  content?: Child | Child[];
  /** Manifest asset id drawn at the centre when there is no `content`. */
  art?: string;
  /** How lit the circle is, 0–1. Ramp it up as a summon charges. */
  charge?: number;
  /** Sides of the inscribed polygon — 0 for none, 5 for a pentagram. */
  sides?: number;
  /** Everything stops turning. */
  still?: boolean;
}

const DEFAULT_RINGS: RuneCircleRing[] = [
  { at: 1, ticks: 48, spin: 90, line: true },
  { at: 0.82, ticks: 12, spin: -50, line: true },
  { at: 0.6, ticks: 24, spin: 34 },
];

/**
 * The summoning circle: concentric rings of runes turning at their own speeds
 * around whatever is being conjured. Enchanting, summoning, resurrection,
 * portals — anywhere a game needs to say "magic is happening here".
 *
 *   const circle = new RuneCircle({
 *     size: 300, color: '#a335ee', charge: 0.4, sides: 5,
 *     art: 'blood-hex-circle',
 *     rings: [
 *       { at: 1, glyphs: ['glyph-arcane-symbol', 'glyph-cursed-eye'], spin: 70, line: true },
 *       { at: 0.72, ticks: 16, spin: -40 },
 *     ],
 *   });
 *   summon.on('progress', (p) => circle.setCharge(p));
 *
 * Every rune is placed by rotating a zero-height spoke from the centre, so a
 * ring of six and a ring of forty-eight are the same code and no trigonometry
 * runs in JavaScript. `charge` drives one custom property that the glow, the
 * ring opacity and the polygon all read, so a summon lights the whole circle
 * from a single number.
 */
export class RuneCircle extends FuiComponent<RuneCircleOptions> {
  readonly core: HTMLElement;

  constructor(opts: RuneCircleOptions = {}) {
    const size = opts.size ?? 280;
    const root = h('div', {
      class: 'fui fui-runes',
      dataset: { still: String(!!opts.still) },
      style: {
        '--fui-runes-size': `${size}px`,
        '--fui-runes-charge': String(clamp(opts.charge ?? 0.25, 0, 1)),
        ...(opts.color ? { '--fui-runes-ink': opts.color } : {}),
      },
      attrs: { 'aria-hidden': 'true' },
    });
    super(root, opts);

    for (const ring of opts.rings ?? DEFAULT_RINGS) {
      root.appendChild(this.buildRing(ring));
    }

    if (opts.sides && opts.sides >= 3) {
      root.appendChild(this.buildPolygon(opts.sides));
    }

    this.core = h('div', { class: 'fui-runes__core' });
    if (opts.content != null) {
      append(this.core, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    } else if (opts.art) {
      this.core.appendChild(
        h('span', {
          class: 'fui-runes__art',
          style: { backgroundImage: `var(--fui-img-${opts.art})` },
        }),
      );
    }
    root.appendChild(this.core);
  }

  /** How lit the circle is, 0–1. One number drives the whole scene. */
  setCharge(charge: number): this {
    this.opts.charge = clamp(charge, 0, 1);
    this.el.style.setProperty('--fui-runes-charge', String(this.opts.charge));
    return this;
  }

  /** Swap what is being conjured. */
  setContent(...kids: Child[]): this {
    while (this.core.firstChild) this.core.removeChild(this.core.firstChild);
    append(this.core, ...kids);
    return this;
  }

  private buildRing(ring: RuneCircleRing): HTMLElement {
    const at = clamp(ring.at ?? 1, 0.1, 1);
    const el = h('div', {
      class: 'fui-runes__ring',
      dataset: { line: String(!!ring.line) },
      style: {
        '--fui-runes-at': String(at),
        '--fui-runes-spin': `${Math.abs(ring.spin ?? 60)}s`,
        '--fui-runes-dir': (ring.spin ?? 60) < 0 ? 'reverse' : 'normal',
        ...(ring.color ? { '--fui-runes-ink': ring.color } : {}),
      },
    });

    const marks = ring.glyphs?.length ? ring.glyphs.length * 2 : (ring.ticks ?? 12);
    for (let i = 0; i < marks; i++) {
      const angle = (i / marks) * 360;
      // A zero-height spoke rotated from the centre puts the rune on the rim
      // without any trigonometry, and the counter-rotation keeps it upright.
      const spoke = h('span', {
        class: 'fui-runes__spoke',
        style: { '--fui-runes-angle': `${angle.toFixed(2)}deg` },
      });
      const glyph = ring.glyphs?.length ? ring.glyphs[i % ring.glyphs.length] : null;
      spoke.appendChild(
        h('span', {
          class: glyph ? 'fui-runes__glyph' : 'fui-runes__tick',
          style: glyph ? { '--fui-glyph-src': `var(--fui-img-${glyph})` } : {},
        }),
      );
      el.appendChild(spoke);
    }
    return el;
  }

  private buildPolygon(sides: number): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const doc = this.el.ownerDocument;
    const svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('class', 'fui-runes__poly');
    svg.setAttribute('viewBox', '0 0 100 100');

    const points: Array<[number, number]> = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      points.push([50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34]);
    }
    // Stepping two vertices at a time draws the star every pentagram wants; on
    // an even count that would only reach half the points, so it falls back to
    // the plain polygon.
    const step = sides % 2 === 1 ? 2 : 1;
    const order: Array<[number, number]> = [];
    for (let i = 0, at = 0; i < sides; i++, at = (at + step) % sides) order.push(points[at]);

    const poly = doc.createElementNS(NS, 'polygon');
    poly.setAttribute('class', 'fui-runes__poly-shape');
    poly.setAttribute('points', order.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
    svg.appendChild(poly);
    return svg;
  }
}

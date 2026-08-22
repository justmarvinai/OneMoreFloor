import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, clamp, type Child } from '../core/dom.ts';

export interface BackdropLayer {
  /** Manifest asset id for this layer's art. */
  art: string;
  /**
   * How far the layer moves relative to the pointer, roughly −1 to 1. Negative
   * moves against the pointer, which reads as distance behind the subject.
   */
  depth?: number;
  /** Layer opacity, 0–1. */
  opacity?: number;
  /** `cover` fills the frame, `contain` fits it, `tile` repeats it. */
  fit?: 'cover' | 'contain' | 'tile';
  /** Blur in pixels — the cheap way to push a layer back. */
  blur?: number;
  /** Any CSS blend mode, e.g. `'screen'` for a fog or light pass. */
  blend?: string;
}

export interface SceneBackdropOptions extends BaseOptions {
  /** Painted layers, back to front. */
  layers: BackdropLayer[];
  /** Height in pixels, or any CSS length such as `'60vh'`. */
  height?: number | string;
  /** Darken the whole scene so foreground UI stays readable, 0–1. */
  scrim?: number;
  /** Fade the bottom edge into the page. */
  fadeBottom?: boolean;
  /** Vignette strength, 0–1. */
  vignette?: number;
  /** Follow the pointer. Off by default, because it costs a listener. */
  parallax?: boolean;
  /** Drift the layers slowly on their own. Ignored when `parallax` is set. */
  drift?: boolean;
  /** Foreground content laid over the scene. */
  content?: Child | Child[];
}

/**
 * The layered painted background a title screen, chapter card or battle stage
 * sits on — several pieces of art at different depths, with an optional
 * parallax that separates them.
 *
 *   new SceneBackdrop({
 *     height: 320,
 *     parallax: true,
 *     scrim: 0.35,
 *     layers: [
 *       { art: 'bg-wide', depth: -0.2, blur: 2 },
 *       { art: 'bg-scene-dark', depth: 0.15, opacity: 0.8 },
 *       { art: 'silhouette-warrior-m', depth: 0.5, fit: 'contain' },
 *     ],
 *     content: title.el,
 *   });
 *
 * Parallax is one pointer listener on the root that writes two custom
 * properties; each layer multiplies them by its own depth in CSS, so any number
 * of layers costs exactly one handler and no per-frame JavaScript.
 */
export class SceneBackdrop extends FuiComponent<SceneBackdropOptions> {
  readonly inner: HTMLElement;

  constructor(opts: SceneBackdropOptions) {
    const root = h('div', {
      class: 'fui fui-scene',
      style: {
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
        '--fui-scene-scrim': String(clamp(opts.scrim ?? 0, 0, 1)),
        '--fui-scene-vignette': String(clamp(opts.vignette ?? 0.5, 0, 1)),
      },
    });
    if (opts.fadeBottom) root.classList.add('fui-scene--fade');
    if (opts.drift) root.classList.add('fui-scene--drift');
    super(root, opts);

    opts.layers.forEach((layer, i) => {
      const el = h('span', {
        class: 'fui-scene__layer',
        dataset: { fit: layer.fit ?? 'cover' },
        style: {
          '--fui-scene-art': `var(--fui-img-${layer.art})`,
          '--fui-scene-depth': String(layer.depth ?? 0),
          // A stable per-layer phase so drifting layers do not move in lockstep.
          '--fui-scene-phase': `${(i % 3) * -3}s`,
          ...(layer.opacity != null ? { opacity: String(layer.opacity) } : {}),
          ...(layer.blur ? { filter: `blur(${layer.blur}px)` } : {}),
          ...(layer.blend ? { mixBlendMode: layer.blend } : {}),
        },
        attrs: { 'aria-hidden': 'true' },
      });
      root.appendChild(el);
    });

    root.appendChild(h('span', { class: 'fui-scene__scrim', attrs: { 'aria-hidden': 'true' } }));

    this.inner = h('div', { class: 'fui-scene__inner' });
    if (opts.content) {
      append(this.inner, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    }
    root.appendChild(this.inner);

    if (opts.parallax) this.bindParallax();
  }

  /**
   * One listener writes the pointer offset as two properties; every layer reads
   * them and scales by its own depth, so parallax costs nothing per layer.
   */
  private bindParallax(): void {
    const onMove = (ev: PointerEvent) => {
      const r = this.el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.el.style.setProperty('--fui-scene-x', ((ev.clientX - r.left) / r.width - 0.5).toFixed(4));
      this.el.style.setProperty('--fui-scene-y', ((ev.clientY - r.top) / r.height - 0.5).toFixed(4));
    };
    const onLeave = () => {
      this.el.style.setProperty('--fui-scene-x', '0');
      this.el.style.setProperty('--fui-scene-y', '0');
    };
    this.el.addEventListener('pointermove', onMove);
    this.el.addEventListener('pointerleave', onLeave);
    this.el.classList.add('is-parallax');
    this.onDestroy(() => {
      this.el.removeEventListener('pointermove', onMove);
      this.el.removeEventListener('pointerleave', onLeave);
    });
  }

  add(...children: Child[]): this {
    append(this.inner, ...children);
    return this;
  }
}

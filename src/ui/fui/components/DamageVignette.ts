import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export type VignetteTone = 'damage' | 'heal' | 'poison' | 'freeze' | 'low' | 'shield';

export interface DamageVignetteOptions extends BaseOptions {
  /** Which edge treatment is showing at rest. Omit for none. */
  tone?: VignetteTone;
  /** How strong the resting effect is, 0–1. */
  level?: number;
  /** How far in from the edge the colour reaches, as a percentage. */
  spread?: number;
  /** Milliseconds a `flash()` takes to fade. */
  flashMs?: number;
  /** Cover the whole viewport rather than the nearest positioned box. */
  fullscreen?: boolean;
  /** Pulse continuously — the heartbeat of a low-health warning. */
  pulse?: boolean;
}

/**
 * The screen-edge wash a game uses to say something is happening to *you* —
 * red on a hit, green on a heal, a slow red heartbeat at low health.
 * `FloatingText` says how much; this says it happened to you.
 *
 *   const vig = new DamageVignette({ fullscreen: true });
 *   onHit((amount) => vig.flash('damage', amount / maxHp));
 *   onHealthChange((hp) => vig.setLow(hp / maxHp < 0.25));
 *
 * A flash is one timer that replaces itself, so a burst of ten hits in a second
 * leaves one pending clear rather than ten racing each other — and the resting
 * state a flash returns to is whatever `setTone()` last set, so a heal landing
 * mid-fight cannot wipe out a low-health warning.
 */
export class DamageVignette extends FuiComponent<DamageVignetteOptions> {
  private restTone: VignetteTone | null;
  private restLevel: number;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: DamageVignetteOptions = {}) {
    const root = h('div', {
      class: 'fui fui-vig',
      dataset: {
        tone: opts.tone ?? '',
        full: String(!!opts.fullscreen),
        pulse: String(!!opts.pulse),
      },
      style: {
        '--fui-vig-level': String(clamp(opts.level ?? (opts.tone ? 1 : 0), 0, 1)),
        '--fui-vig-spread': `${opts.spread ?? 34}%`,
        '--fui-vig-ms': `${opts.flashMs ?? 420}ms`,
      },
      attrs: { 'aria-hidden': 'true' },
    });
    super(root, opts);
    this.restTone = opts.tone ?? null;
    this.restLevel = clamp(opts.level ?? (opts.tone ? 1 : 0), 0, 1);
    this.onDestroy(() => this.cancel());
  }

  /** The state the vignette returns to after a flash. */
  setTone(tone: VignetteTone | null, level = 1): this {
    this.restTone = tone;
    this.restLevel = clamp(level, 0, 1);
    if (!this.timer) this.applyRest();
    return this;
  }

  /** Turn the low-health heartbeat on or off without touching flashes. */
  setLow(on: boolean, level = 0.55): this {
    return on ? this.setTone('low', level).setPulse(true) : this.setTone(null).setPulse(false);
  }

  /** Start or stop the continuous pulse. */
  setPulse(on: boolean): this {
    this.opts.pulse = on;
    this.el.dataset.pulse = String(on);
    return this;
  }

  /**
   * Wash the edges once and fade back to the resting state. Strength is
   * usually the fraction of health the hit took.
   */
  flash(tone: VignetteTone = 'damage', strength = 0.6): this {
    this.cancel();
    this.el.dataset.tone = tone;
    this.el.style.setProperty('--fui-vig-level', String(clamp(strength, 0.08, 1)));
    this.el.dataset.flash = 'true';
    this.emit('vignette:flash', { tone, strength });
    this.timer = setTimeout(() => {
      this.timer = null;
      delete this.el.dataset.flash;
      this.applyRest();
    }, this.opts.flashMs ?? 420);
    return this;
  }

  /** Drop any flash in flight and settle on the resting state. */
  cancel(): this {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    delete this.el.dataset.flash;
    this.applyRest();
    return this;
  }

  private applyRest(): void {
    this.el.dataset.tone = this.restTone ?? '';
    this.el.style.setProperty('--fui-vig-level', String(this.restTone ? this.restLevel : 0));
  }
}

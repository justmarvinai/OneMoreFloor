import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface ImpactFrameOptions extends BaseOptions {
  /** The word stamped across the frame, e.g. `'CRITICAL'`. */
  text?: string;
  /** Smaller line under it — the number, usually. */
  sub?: string;
  /** Which feeling the hit had. */
  tone?: 'crit' | 'heal' | 'block' | 'break' | 'miss';
  /** How hard, 0–1. Scales the burst, the shake and the speed lines. */
  power?: number;
  /** Milliseconds the whole frame lasts. */
  duration?: number;
  /** Draw radiating speed lines behind the word. */
  lines?: boolean;
  /** Play once on construction instead of waiting for `play()`. */
  auto?: boolean;
}

/**
 * The one-frame punctuation on a big hit: the screen flashes, lines rush in,
 * and a word lands. Drop it over the battle stage and call `play()` on the hits
 * worth stopping for.
 *
 *   const impact = new ImpactFrame({ tone: 'crit', power: 0.9, lines: true });
 *   stage.appendChild(impact.el);
 *   combat.on('hit', (h) => h.crit && impact.play('CRITICAL', `${h.damage}`));
 *
 * The whole effect is one CSS animation per layer keyed off a `playing` flag,
 * and `play()` restarts it by toggling the flag with a forced reflow between —
 * so a second crit inside 200 ms replays cleanly instead of being swallowed by
 * the animation still running. `power` is a single knob wired to burst size,
 * shake distance and line count together, because the alternative — three
 * numbers a caller has to keep in agreement — is how effects end up looking
 * mismatched at the extremes.
 */
export class ImpactFrame extends FuiComponent<ImpactFrameOptions> {
  private textEl: HTMLElement;
  private subEl: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: ImpactFrameOptions = {}) {
    const power = Math.max(0, Math.min(1, opts.power ?? 0.7));
    const root = h('div', {
      class: 'fui fui-impact',
      dataset: { tone: opts.tone ?? 'crit', playing: 'off', lines: opts.lines ? 'on' : 'off' },
      style: {
        '--fui-impact-power': String(power),
        '--fui-impact-ms': `${opts.duration ?? 620}ms`,
      },
      attrs: { 'aria-hidden': 'true' },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-impact__flash' }));
    root.appendChild(h('span', { class: 'fui-impact__burst' }));
    if (opts.lines) root.appendChild(h('span', { class: 'fui-impact__lines' }));

    const stack = h('div', { class: 'fui-impact__stack' });
    this.textEl = h('span', { class: 'fui-impact__text', text: opts.text ?? '' });
    this.subEl = h('span', { class: 'fui-impact__sub fui-num', text: opts.sub ?? '' });
    stack.append(this.textEl, this.subEl);
    root.appendChild(stack);

    this.paint();
    if (opts.auto) this.play();
    this.onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });
  }

  /** Fire the frame, optionally with new text. Restarts if already running. */
  play(text = this.opts.text, sub = this.opts.sub): this {
    this.opts.text = text;
    this.opts.sub = sub;
    this.paint();

    this.el.dataset.playing = 'off';
    void this.el.offsetWidth;
    this.el.dataset.playing = 'on';
    this.emit('impact:play', { text, tone: this.opts.tone });

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.dataset.playing = 'off';
      this.emit('impact:end', text);
    }, this.opts.duration ?? 620);
    return this;
  }

  /** Change the feeling without playing. */
  setTone(tone: NonNullable<ImpactFrameOptions['tone']>, power = this.opts.power): this {
    this.opts.tone = tone;
    this.opts.power = power;
    this.paint();
    return this;
  }

  private paint(): void {
    this.el.dataset.tone = this.opts.tone ?? 'crit';
    this.el.style.setProperty(
      '--fui-impact-power',
      String(Math.max(0, Math.min(1, this.opts.power ?? 0.7))),
    );
    this.textEl.textContent = this.opts.text ?? '';
    this.subEl.textContent = this.opts.sub ?? '';
    this.subEl.dataset.empty = this.opts.sub ? 'off' : 'on';
  }
}

import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, clear, commas, duration, type Child } from '../core/dom.ts';

export interface ReviveOption {
  id: string;
  label: string;
  /** What it costs — "1 Phoenix Feather", "80 gems", "Free". */
  cost?: string;
  /** Glyph asset id for the cost. */
  glyph?: string;
  /** How many the player holds. `0` reads as unaffordable. */
  owned?: number;
  /** Highlight this as the one the game recommends. */
  primary?: boolean;
  /** Cannot be taken, with the reason on the button. */
  disabled?: boolean;
}

export interface DeathScreenOptions extends BaseOptions {
  /** The verdict — "You Died", "Defeat", "The run ends here". */
  title?: string;
  /** Line under the verdict. */
  subtitle?: string;
  /** What killed you. */
  killedBy?: string;
  /** Background art asset id. */
  art?: string;
  /** Run stats worth showing before the player leaves. */
  stats?: Array<{ label: string; value: number | string }>;
  /** Ways back into the fight. */
  revives?: ReviveOption[];
  /** Seconds before the revive offer expires. */
  reviveIn?: number;
  /** Label on the give-up button. */
  quitLabel?: string;
  /** Extra content between the stats and the buttons. */
  content?: Child | Child[];
  /** Height in pixels, or any CSS length such as `'100vh'`. */
  height?: number | string;
}

/**
 * The defeat overlay: what killed you, how the run went, and what it costs to
 * get back up. `ResultScreen` reports a battle that ended; this is the one that
 * ended badly and is still asking for a decision.
 *
 *   const death = new DeathScreen({
 *     title: 'You Died', killedBy: 'Gravebound Revenant',
 *     art: 'bg-scene-dark', reviveIn: 10,
 *     stats: [{ label: 'Floor', value: 12 }, { label: 'Gold', value: 48_200 }],
 *     revives: [{ id: 'feather', label: 'Revive', cost: '1 Phoenix Feather', owned: 2, primary: true }],
 *   });
 *   death.on<string>('death:revive', (id) => run.revive(id));
 *   death.on('death:quit', () => run.end());
 *
 * The revive clock runs down and then takes the offer away — that is the whole
 * tension of the screen — so it counts in one interval that stops itself at
 * zero and on `destroy()`. When it expires the buttons go, rather than staying
 * on screen as a lie.
 */
export class DeathScreen extends FuiComponent<DeathScreenOptions> {
  private actions: HTMLElement;
  private ring: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private left: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: DeathScreenOptions = {}) {
    const root = h('div', {
      class: 'fui fui-death',
      style: {
        ...(opts.art ? { '--fui-death-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
      },
      attrs: { role: 'dialog', 'aria-modal': 'true' },
    });
    super(root, opts);
    this.left = opts.reviveIn ?? 0;

    root.appendChild(h('span', { class: 'fui-death__art', attrs: { 'aria-hidden': 'true' } }));

    const box = h('div', { class: 'fui-death__box' });
    box.appendChild(
      h('h2', { class: 'fui-death__title fui-title', text: opts.title ?? 'You Died' }),
    );
    if (opts.subtitle) {
      box.appendChild(h('p', { class: 'fui-death__subtitle', text: opts.subtitle }));
    }
    if (opts.killedBy) {
      box.appendChild(
        h(
          'p',
          { class: 'fui-death__killer' },
          h('span', { class: 'fui-death__killer-label', text: 'Killed by ' }),
          h('span', { class: 'fui-death__killer-name', text: opts.killedBy }),
        ),
      );
    }

    if (opts.stats?.length) {
      const stats = h('div', { class: 'fui-death__stats' });
      for (const s of opts.stats) {
        const cell = h('div', { class: 'fui-death__stat' });
        cell.appendChild(
          h('span', {
            class: 'fui-death__stat-value fui-num',
            text: typeof s.value === 'number' ? commas(s.value) : s.value,
          }),
        );
        cell.appendChild(h('span', { class: 'fui-death__stat-label', text: s.label }));
        stats.appendChild(cell);
      }
      box.appendChild(stats);
    }

    if (opts.content != null) {
      const slot = h('div', { class: 'fui-death__content' });
      append(slot, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
      box.appendChild(slot);
    }

    if (opts.reviveIn != null && opts.revives?.length) {
      this.ring = h('div', {
        class: 'fui-death__ring',
        style: { '--fui-death-p': '1' },
      });
      this.countEl = h('span', { class: 'fui-death__count fui-num' });
      this.ring.appendChild(this.countEl);
      box.appendChild(this.ring);
      this.timer = setInterval(() => this.tick(), 1000);
      this.onDestroy(() => this.stop());
    }

    this.actions = h('div', { class: 'fui-death__actions' });
    box.appendChild(this.actions);
    root.appendChild(box);

    this.paint();
  }

  /** Seconds left on the revive offer. */
  timeLeft(): number {
    return this.left;
  }

  /** Stop the revive clock. Called on destroy and when it reaches zero. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  /** End the offer now — what taking a revive or quitting does. */
  expire(): this {
    this.left = 0;
    this.stop();
    this.paint();
    this.emit('death:expire');
    return this;
  }

  private tick(): void {
    this.left = Math.max(0, this.left - 1);
    if (this.countEl) this.countEl.textContent = String(this.left);
    if (this.ring) {
      const total = this.opts.reviveIn || 1;
      this.ring.style.setProperty('--fui-death-p', (this.left / total).toFixed(4));
    }
    if (this.left <= 0) {
      this.stop();
      this.paint();
      this.emit('death:expire');
    }
  }

  private paint(): void {
    clear(this.actions);
    const expired = this.opts.reviveIn != null && this.left <= 0;

    if (this.ring) this.ring.hidden = expired;
    if (this.countEl && !expired) this.countEl.textContent = String(this.left);

    // Once the offer is gone the buttons go with it. Leaving a dead "Revive" on
    // screen is worse than showing none at all.
    if (!expired) {
      for (const r of this.opts.revives ?? []) {
        const out = r.owned === 0;
        const btn = h('button', {
          class: 'fui-death__revive',
          dataset: { primary: String(!!r.primary) },
          attrs: {
            type: 'button',
            disabled: r.disabled || out || undefined,
          },
        });
        btn.appendChild(h('span', { class: 'fui-death__revive-label', text: r.label }));
        if (r.cost || r.owned != null) {
          const cost = h('span', { class: 'fui-death__revive-cost' });
          if (r.glyph) {
            cost.appendChild(
              h('span', {
                class: 'fui-death__revive-glyph',
                style: { '--fui-glyph-src': `var(--fui-img-${r.glyph})` },
              }),
            );
          }
          cost.appendChild(
            h('span', {
              text: out ? `${r.cost ?? ''} — none left`.trim() : (r.cost ?? ''),
            }),
          );
          if (r.owned != null && r.owned > 0) {
            cost.appendChild(h('span', { class: 'fui-death__revive-own', text: `×${r.owned}` }));
          }
          btn.appendChild(cost);
        }
        btn.addEventListener('click', () => {
          this.expire();
          this.emit('death:revive', r.id);
        });
        this.actions.appendChild(btn);
      }
    }

    const quit = h('button', {
      class: 'fui-death__quit',
      text: this.opts.quitLabel ?? (expired ? 'Return to town' : 'Give up'),
      attrs: { type: 'button' },
    });
    quit.addEventListener('click', () => {
      this.stop();
      this.emit('death:quit');
    });
    this.actions.appendChild(quit);

    if (this.opts.reviveIn != null && !expired && this.countEl) {
      this.countEl.setAttribute('aria-label', `${duration(this.left)} to revive`);
    }
  }
}

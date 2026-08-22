import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, append, type Child } from '../core/dom.ts';

export interface GateServer {
  id: string;
  name: string;
  /** `good` is healthy, `busy` is queueing, `full` refuses, `down` is offline. */
  load?: 'good' | 'busy' | 'full' | 'down';
  /** Region label, e.g. "EU". */
  region?: string;
  /** Ping in milliseconds. */
  ping?: number;
  /** The player has a character here. */
  hasCharacter?: boolean;
  /** Marked as the recommended pick. */
  recommended?: boolean;
}

export interface TitleGateOptions extends BaseOptions {
  /** Game name, set in the display face. */
  title: string;
  /** Line under the title. */
  tagline?: string;
  /** Background art asset id. */
  art?: string;
  /** Silhouette or key-art asset id, drawn large on one side. */
  figure?: string;
  /** Which side the figure stands on. */
  figureSide?: 'left' | 'right';
  /** Servers to choose from. */
  servers?: GateServer[];
  /** Server selected first. */
  server?: string;
  /** Label on the enter button. */
  action?: string;
  /** Small print under the button — version, legal, build id. */
  footnote?: string;
  /** Extra controls above the button — a name field, a checkbox. */
  extra?: Child | Child[];
  /** Height in pixels, or any CSS length such as `'100vh'`. */
  height?: number | string;
}

const LOAD_LABEL: Record<string, string> = {
  good: 'Good', busy: 'Busy', full: 'Full', down: 'Offline',
};

/**
 * The gate a live game opens on: key art, the title, a server to pick and one
 * button through. `MainMenu` is what you see *after* this — the gate is the
 * screen that has to hold a queue and a broken region gracefully.
 *
 *   const gate = new TitleGate({
 *     title: 'Ashfall', tagline: 'The gate has opened.',
 *     art: 'bg-wide', figure: 'silhouette-warrior-m', figureSide: 'right',
 *     servers: [
 *       { id: 'eu1', name: 'Emberwood', region: 'EU', load: 'good', ping: 24, hasCharacter: true },
 *       { id: 'na2', name: 'Ashvale', region: 'NA', load: 'full', ping: 132 },
 *     ],
 *     action: 'Enter',
 *   });
 *   gate.on<string>('gate:enter', (serverId) => connect(serverId));
 *
 * A full or offline server cannot be selected, and the button reports why
 * rather than going quietly dead — that state is the whole reason this screen
 * exists on launch day.
 */
export class TitleGate extends FuiComponent<TitleGateOptions> {
  private selected: string | null;
  private serverList: HTMLElement | null = null;
  private button: HTMLButtonElement;

  constructor(opts: TitleGateOptions) {
    const root = h('div', {
      class: 'fui fui-gate',
      dataset: { figure: opts.figureSide ?? 'right' },
      style: {
        ...(opts.art ? { '--fui-gate-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.figure ? { '--fui-gate-figure': `var(--fui-img-${opts.figure})` } : {}),
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
      },
    });
    super(root, opts);

    const first = opts.servers?.find((s) => s.load !== 'full' && s.load !== 'down');
    this.selected = opts.server ?? first?.id ?? null;

    root.appendChild(h('span', { class: 'fui-gate__art', attrs: { 'aria-hidden': 'true' } }));
    if (opts.figure) {
      root.appendChild(h('span', { class: 'fui-gate__figure', attrs: { 'aria-hidden': 'true' } }));
    }

    const panel = h('div', { class: 'fui-gate__panel' });
    panel.appendChild(h('h1', { class: 'fui-gate__title fui-title', text: opts.title }));
    if (opts.tagline) {
      panel.appendChild(h('p', { class: 'fui-gate__tagline', text: opts.tagline }));
    }

    if (opts.servers?.length) {
      panel.appendChild(h('span', { class: 'fui-gate__label fui-label', text: 'Server' }));
      this.serverList = h('div', { class: 'fui-gate__servers fui-scroll' });
      panel.appendChild(this.serverList);
    }

    if (opts.extra) {
      const extra = h('div', { class: 'fui-gate__extra' });
      append(extra, ...(Array.isArray(opts.extra) ? opts.extra : [opts.extra]));
      panel.appendChild(extra);
    }

    this.button = h('button', {
      class: 'fui-gate__enter',
      text: opts.action ?? 'Enter',
      attrs: { type: 'button' },
    });
    this.button.addEventListener('click', () => {
      if (!this.button.disabled) this.emit('gate:enter', this.selected);
    });
    panel.appendChild(this.button);

    if (opts.footnote) {
      panel.appendChild(h('p', { class: 'fui-gate__footnote', text: opts.footnote }));
    }
    root.appendChild(panel);

    this.renderServers();
  }

  /** The server currently chosen. */
  get(): string | null {
    return this.selected;
  }

  select(id: string, opts?: { silent?: boolean }): this {
    const server = this.opts.servers?.find((s) => s.id === id);
    if (!server || server.load === 'full' || server.load === 'down') return this;
    this.selected = id;
    this.renderServers();
    if (!opts?.silent) this.emit('gate:server', id);
    return this;
  }

  /** Apply fresh server states — what a status poll calls. */
  setServers(servers: GateServer[]): this {
    this.opts.servers = servers;
    this.renderServers();
    return this;
  }

  private renderServers(): void {
    if (this.serverList) {
      clear(this.serverList);
      for (const s of this.opts.servers ?? []) {
        const load = s.load ?? 'good';
        const blocked = load === 'full' || load === 'down';
        const row = h('button', {
          class: 'fui-gate__server',
          dataset: { load },
          attrs: { type: 'button', disabled: blocked || undefined },
        });
        if (s.id === this.selected) row.classList.add('is-on');

        row.appendChild(h('span', { class: 'fui-gate__dot' }));
        const names = h('div', { class: 'fui-gate__server-names' });
        names.appendChild(h('span', { class: 'fui-gate__server-name', text: s.name }));
        const meta = h('div', { class: 'fui-gate__server-meta' });
        if (s.region) meta.appendChild(h('span', { text: s.region }));
        meta.appendChild(h('span', { text: LOAD_LABEL[load] }));
        if (s.ping != null) meta.appendChild(h('span', { class: 'fui-num', text: `${s.ping} ms` }));
        names.appendChild(meta);
        row.appendChild(names);

        if (s.hasCharacter) {
          row.appendChild(h('span', { class: 'fui-gate__flag', text: 'Character' }));
        } else if (s.recommended) {
          row.appendChild(h('span', { class: 'fui-gate__flag fui-gate__flag--rec', text: 'New' }));
        }

        if (!blocked) row.addEventListener('click', () => this.select(s.id));
        this.serverList.appendChild(row);
      }
    }

    // The button explains itself rather than going quietly dead — the state
    // this screen exists to handle on launch day.
    const chosen = this.opts.servers?.find((s) => s.id === this.selected);
    const needsServer = !!this.opts.servers?.length && !chosen;
    this.button.disabled = needsServer;
    this.button.textContent = needsServer
      ? 'Choose a server'
      : chosen?.load === 'busy'
        ? 'Enter (queue)'
        : (this.opts.action ?? 'Enter');
  }
}

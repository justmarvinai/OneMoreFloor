import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export type TrailNodeKind = 'battle' | 'elite' | 'boss' | 'event' | 'rest' | 'chest';

export interface TrailNode {
  id: string;
  /** Short label inside the disc — "7", "4-3". Ignored when `art` is set. */
  label?: string;
  /** Full name printed beside the node. */
  name?: string;
  /** What kind of stop this is. `chest` is a milestone reward, not a stage. */
  kind?: TrailNodeKind;
  /** `locked` cannot be entered, `current` is the next objective. */
  state?: 'locked' | 'open' | 'current' | 'cleared';
  /** Clear rating out of three. */
  stars?: number;
  /** Energy the stage costs to enter. */
  cost?: number;
  /** Manifest asset id painted inside the disc. */
  art?: string;
  /** Glyph asset id, used when there is no square art. */
  glyph?: string;
  /** Stars needed to open this milestone. `chest` nodes only. */
  requires?: number;
  /** Already collected. `chest` nodes only. */
  claimed?: boolean;
  /** Line under the name — a level range, a recommended power, a reward. */
  note?: string;
  /**
   * Where the node sits across the trail, 0 (left) to 1 (right). Left unset,
   * nodes wander down the middle on their own.
   */
  at?: number;
}

export interface TrailChapter {
  id: string;
  /** Chapter name, printed on the divider. */
  title: string;
  /** Line under the chapter name. */
  subtitle?: string;
  /** Background art asset id for this chapter's stretch of the trail. */
  art?: string;
  nodes: TrailNode[];
}

export interface TrailDifficulty {
  id: string;
  label: string;
  /** Not unlocked yet — the tab says why rather than vanishing. */
  locked?: boolean;
  /** Requirement shown when locked, e.g. "Clear Chapter 6". */
  requirement?: string;
}

export interface StageTrailOptions extends BaseOptions {
  /** The chapters, in the order they are walked. */
  chapters: TrailChapter[];
  /** Heading above the trail. */
  title?: string;
  /** Difficulty tabs. Omit for a campaign with one track. */
  difficulties?: TrailDifficulty[];
  /** Which difficulty is showing. */
  difficulty?: string;
  /** Stars available across the whole trail. Defaults to three per stage. */
  totalStars?: number;
  /** Height of the scrolling trail in pixels, or any CSS length. */
  height?: number | string;
  /** Vertical distance between nodes, in pixels. */
  spacing?: number;
  /** Centre the current node when the trail mounts. */
  autoScroll?: boolean;
  /** Energy the player holds, shown in the header and used to grey out entries. */
  energy?: number;
}

/** Node kinds that are stops on the path rather than stages to fight. */
const NON_STAGE = new Set<TrailNodeKind>(['chest', 'rest']);

/**
 * The campaign as a trail you scroll down — the shape a live squad-RPG uses
 * once a chapter is more than a handful of stages: a wandering path, milestone
 * chests gated on stars, chapter dividers and a difficulty track.
 *
 * `StageSelect` is the compact take — a row of numbered discs that drops into a
 * panel. This is the full-screen one, and the two are interchangeable at the
 * data level: both speak stages, stars, lock state and energy.
 *
 *   const trail = new StageTrail({
 *     title: 'Emberwood Vale', height: 560, energy: 42, autoScroll: true,
 *     difficulties: [{ id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Hard' }],
 *     difficulty: 'normal',
 *     chapters: [{
 *       id: 'ch4', title: 'Chapter 4', subtitle: 'The Sunken Gate',
 *       nodes: [
 *         { id: '4-1', label: '1', name: 'Ashfall Gate', state: 'cleared', stars: 3, cost: 8 },
 *         { id: 'm1', kind: 'chest', requires: 15, name: 'Ancient Chest' },
 *         { id: '4-2', label: '2', name: 'Sunken Road', state: 'current', cost: 8 },
 *       ],
 *     }],
 *   });
 *   trail.on<TrailNode>('trail:select', (node) => battle.start(node.id));
 *
 * The path is two SVG curves over the same points — the whole route drawn dim,
 * and the walked part drawn bright on top, stopping at the last cleared node.
 * Deriving the bright one from the node states rather than measuring the path
 * at runtime is what lets the trail pre-render on the server and still be right.
 */
export class StageTrail extends FuiComponent<StageTrailOptions> {
  private scroller: HTMLElement;
  private body: HTMLElement;
  private tabs: HTMLElement | null = null;
  private starEl: HTMLElement | null = null;
  private barEl: HTMLElement | null = null;
  private nodeEls = new Map<string, HTMLElement>();
  private currentEl: HTMLElement | null = null;
  private pending: number | null = null;

  constructor(opts: StageTrailOptions) {
    const root = h('div', {
      class: 'fui fui-trail',
      style: { '--fui-trail-row': `${opts.spacing ?? 96}px` },
    });
    super(root, opts);

    const head = h('header', { class: 'fui-trail__head' });
    if (opts.title) {
      head.appendChild(h('h2', { class: 'fui-trail__title fui-title', text: opts.title }));
    }

    const meter = h('div', { class: 'fui-trail__meter' });
    this.starEl = h('span', { class: 'fui-trail__stars fui-num' });
    meter.appendChild(this.starEl);
    this.barEl = h('span', { class: 'fui-trail__bar' });
    this.barEl.appendChild(h('span', { class: 'fui-trail__bar-fill' }));
    meter.appendChild(this.barEl);
    if (opts.energy != null) {
      meter.appendChild(
        h('span', { class: 'fui-trail__energy fui-num', text: `⚡ ${commas(opts.energy)}` }),
      );
    }
    head.appendChild(meter);
    root.appendChild(head);

    if (opts.difficulties?.length) {
      this.tabs = h('div', { class: 'fui-trail__tabs', attrs: { role: 'tablist' } });
      root.appendChild(this.tabs);
      this.paintTabs();
    }

    this.scroller = h('div', {
      class: 'fui-trail__scroller fui-scroll',
      style:
        opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {},
    });
    this.body = h('div', { class: 'fui-trail__body' });
    this.scroller.appendChild(this.body);
    root.appendChild(this.scroller);

    this.render();
    // A component cannot know when it is mounted, and before it is there is no
    // layout to scroll against — `offsetTop` and `clientHeight` are both zero.
    // One frame later they are real, which is the earliest this can work.
    if (opts.autoScroll ?? true) this.deferScroll();
    this.onDestroy(() => this.cancelScroll());
  }

  /** Stars earned across every stage on the trail. */
  earnedStars(): number {
    return this.stages().reduce((n, s) => n + (s.stars ?? 0), 0);
  }

  /** Stars the trail is worth in total. */
  totalStars(): number {
    return this.opts.totalStars ?? this.stages().length * 3;
  }

  /** Every node that is a stage rather than a chest or a camp. */
  stages(): TrailNode[] {
    return this.opts.chapters
      .flatMap((c) => c.nodes)
      .filter((n) => !NON_STAGE.has(n.kind ?? 'battle'));
  }

  /** The node the player is being pointed at, if any. */
  currentNode(): TrailNode | undefined {
    return this.opts.chapters.flatMap((c) => c.nodes).find((n) => n.state === 'current');
  }

  /** Milestones whose star requirement is met and which are still unclaimed. */
  claimable(): TrailNode[] {
    const earned = this.earnedStars();
    return this.opts.chapters
      .flatMap((c) => c.nodes)
      .filter((n) => n.kind === 'chest' && !n.claimed && (n.requires ?? 0) <= earned);
  }

  /** Switch track. The trail is rebuilt and scrolled back to the current node. */
  setDifficulty(id: string): this {
    const diff = this.opts.difficulties?.find((d) => d.id === id);
    if (!diff || diff.locked) return this;
    this.opts.difficulty = id;
    this.paintTabs();
    this.emit('trail:difficulty', id);
    return this;
  }

  /** Replace the chapters, e.g. after switching difficulty. */
  setChapters(chapters: TrailChapter[]): this {
    this.opts.chapters = chapters;
    this.render();
    this.deferScroll();
    return this;
  }

  /** Mark a milestone collected. */
  claim(id: string): this {
    const node = this.opts.chapters.flatMap((c) => c.nodes).find((n) => n.id === id);
    if (!node || node.kind !== 'chest' || node.claimed) return this;
    if ((node.requires ?? 0) > this.earnedStars()) return this;
    node.claimed = true;
    this.render();
    this.emit('trail:claim', id);
    return this;
  }

  /** Queue the initial scroll for the first frame after mount. */
  private deferScroll(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    this.cancelScroll();
    this.pending = requestAnimationFrame(() => {
      this.pending = null;
      this.scrollToCurrent({ smooth: false });
    });
  }

  private cancelScroll(): void {
    if (this.pending != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.pending);
    }
    this.pending = null;
  }

  /** Bring the current node into view. Called on mount unless turned off. */
  scrollToCurrent(opts?: { smooth?: boolean }): this {
    const el = this.currentEl;
    if (!el || typeof el.getBoundingClientRect !== 'function') return this;
    // Rects rather than `offsetTop`: every stop is inside a positioned row, so
    // `offsetTop` measures against the row and comes back as a handful of
    // pixels. Under a server-side DOM the rects are all zero, which makes this
    // a no-op there rather than an error.
    const node = el.getBoundingClientRect();
    const view = this.scroller.getBoundingClientRect();
    if (!view.height) return this;
    const delta = node.top - view.top - (view.height - node.height) / 2;
    const top = Math.max(0, this.scroller.scrollTop + delta);
    if (typeof this.scroller.scrollTo === 'function') {
      this.scroller.scrollTo({ top, behavior: opts?.smooth ? 'smooth' : 'auto' });
    } else {
      this.scroller.scrollTop = top;
    }
    return this;
  }

  private paintTabs(): void {
    if (!this.tabs || !this.opts.difficulties) return;
    clear(this.tabs);
    for (const diff of this.opts.difficulties) {
      const tab = h('button', {
        class: 'fui-trail__tab',
        text: diff.label,
        attrs: {
          type: 'button',
          role: 'tab',
          'aria-selected': String(diff.id === this.opts.difficulty),
          disabled: diff.locked || undefined,
          // A locked track says what would unlock it rather than going quiet.
          title: diff.locked ? (diff.requirement ?? 'Locked') : undefined,
        },
      });
      if (diff.id === this.opts.difficulty) tab.classList.add('is-on');
      if (diff.locked) tab.classList.add('is-locked');
      tab.addEventListener('click', () => this.setDifficulty(diff.id));
      this.tabs.appendChild(tab);
    }
  }

  /** Where a node sits across the trail, as a fraction. */
  private lane(node: TrailNode, index: number): number {
    if (node.at != null) return clamp(node.at, 0, 1);
    // A sine gives a path that wanders rather than zig-zagging on a fixed
    // rhythm, and it is a pure function of the index so the server and the
    // browser lay the trail out identically.
    return 0.5 + 0.3 * Math.sin(index * 0.85);
  }

  private render(): void {
    clear(this.body);
    this.nodeEls.clear();
    this.currentEl = null;

    const earned = this.earnedStars();
    const total = this.totalStars();
    if (this.starEl) this.starEl.textContent = `★ ${commas(earned)} / ${commas(total)}`;
    if (this.barEl) {
      this.barEl.style.setProperty('--fui-trail-p', (total ? earned / total : 0).toFixed(4));
    }

    // The path is drawn over the whole trail in one viewBox, so its y axis has
    // to agree with the DOM exactly — and the DOM interleaves chapter dividers
    // with node rows. Both heights are fixed in CSS and mirrored here, which is
    // what lets one SVG span everything without measuring anything.
    const rowH = this.opts.spacing ?? 96;
    const chapterH = 56;
    let y = 0;
    const points: Array<{ x: number; y: number; walked: boolean }> = [];
    let index = 0;

    for (const chapter of this.opts.chapters) {
      const divider = h('div', {
        class: 'fui-trail__chapter',
        style: chapter.art ? { '--fui-trail-art': `var(--fui-img-${chapter.art})` } : {},
      });
      divider.appendChild(
        h('span', { class: 'fui-trail__chapter-title fui-title', text: chapter.title }),
      );
      if (chapter.subtitle) {
        divider.appendChild(
          h('span', { class: 'fui-trail__chapter-sub', text: chapter.subtitle }),
        );
      }
      this.body.appendChild(divider);
      y += chapterH;

      for (const node of chapter.nodes) {
        const lane = this.lane(node, index);
        const kind = node.kind ?? 'battle';
        const state = node.state ?? (kind === 'chest' ? 'open' : 'locked');
        const walked = state === 'cleared' || state === 'current';
        points.push({ x: lane * 100, y: y + rowH / 2, walked });

        const stop = h('div', {
          class: 'fui-trail__row',
          style: { '--fui-trail-lane': `${(lane * 100).toFixed(2)}%` },
          // Past the middle, the label hangs to the left of the disc instead of
          // the right, so it never runs off the edge of a narrow trail.
          dataset: { side: lane > 0.55 ? 'left' : 'right' },
        });
        stop.appendChild(this.buildNode(node, kind, state, earned));
        this.body.appendChild(stop);
        y += rowH;
        index++;
      }
    }

    this.body.style.setProperty('--fui-trail-height', `${y}px`);
    this.body.insertBefore(this.drawPath(points, y), this.body.firstChild);
  }

  private buildNode(
    node: TrailNode,
    kind: TrailNodeKind,
    state: NonNullable<TrailNode['state']>,
    earned: number,
  ): HTMLElement {
    const isChest = kind === 'chest';
    const ready = isChest && !node.claimed && (node.requires ?? 0) <= earned;
    const locked = isChest ? !ready && !node.claimed : state === 'locked';
    const poor =
      !isChest && node.cost != null && this.opts.energy != null && node.cost > this.opts.energy;

    const el = h(locked ? 'div' : 'button', {
      class: 'fui-trail__node',
      dataset: {
        kind,
        state: isChest ? (node.claimed ? 'cleared' : ready ? 'current' : 'locked') : state,
      },
      attrs: {
        type: locked ? undefined : 'button',
        'aria-label': node.name ?? node.label ?? node.id,
      },
    });
    if (state === 'current' && !isChest) this.currentEl = el;

    const disc = h('span', { class: 'fui-trail__disc' });
    if (node.art) {
      disc.classList.add('has-art');
      disc.style.backgroundImage = `var(--fui-img-${node.art})`;
    } else if (node.glyph) {
      disc.appendChild(
        h('span', {
          class: 'fui-trail__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${node.glyph})` },
        }),
      );
    } else if (node.label) {
      disc.appendChild(h('span', { class: 'fui-trail__num fui-num', text: node.label }));
    }
    el.appendChild(disc);

    const info = h('div', { class: 'fui-trail__info' });
    if (node.name) info.appendChild(h('span', { class: 'fui-trail__name', text: node.name }));

    if (!isChest && node.stars != null && state === 'cleared') {
      const stars = h('span', { class: 'fui-trail__stars-row', attrs: { 'aria-hidden': 'true' } });
      for (let i = 0; i < 3; i++) {
        const star = h('span', { class: 'fui-trail__star' });
        if (i < clamp(node.stars, 0, 3)) star.classList.add('is-on');
        stars.appendChild(star);
      }
      info.appendChild(stars);
    }

    const bits: string[] = [];
    if (isChest && node.requires != null) bits.push(`★ ${node.requires}`);
    if (node.note) bits.push(node.note);
    if (!isChest && node.cost != null && state !== 'locked') bits.push(`⚡ ${node.cost}`);
    if (bits.length) {
      info.appendChild(h('span', { class: 'fui-trail__note fui-num', text: bits.join('  ·  ') }));
    }
    if (info.childNodes.length) el.appendChild(info);

    if (poor) el.classList.add('is-poor');

    if (!locked) {
      el.addEventListener('click', () => {
        if (isChest) this.claim(node.id);
        else this.emit('trail:select', node);
      });
    }
    this.nodeEls.set(node.id, el);
    return el;
  }

  /**
   * Two curves over the same points: the whole route dim, and the walked part
   * bright on top. The bright one stops at the last node whose state says it
   * has been reached, which is why nothing here has to measure the DOM.
   */
  private drawPath(
    points: Array<{ x: number; y: number; walked: boolean }>,
    height: number,
  ): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const doc = this.el.ownerDocument;
    const svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('class', 'fui-trail__path');
    svg.setAttribute('viewBox', `0 0 100 ${Math.max(1, height)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const route = (list: Array<{ x: number; y: number }>) => {
      if (list.length < 2) return '';
      // A smooth curve through the points: each segment leaves and arrives
      // vertically, so the trail bends rather than kinking at every node.
      let d = `M ${list[0].x.toFixed(2)} ${list[0].y.toFixed(2)}`;
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const b = list[i];
        const mid = (a.y + b.y) / 2;
        d += ` C ${a.x.toFixed(2)} ${mid.toFixed(2)}, ${b.x.toFixed(2)} ${mid.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
      }
      return d;
    };

    const full = doc.createElementNS(NS, 'path');
    full.setAttribute('class', 'fui-trail__route');
    full.setAttribute('d', route(points));
    svg.appendChild(full);

    let last = -1;
    points.forEach((p, i) => {
      if (p.walked) last = i;
    });
    if (last > 0) {
      const walked = doc.createElementNS(NS, 'path');
      walked.setAttribute('class', 'fui-trail__route fui-trail__route--walked');
      walked.setAttribute('d', route(points.slice(0, last + 1)));
      svg.appendChild(walked);
    }
    return svg;
  }
}

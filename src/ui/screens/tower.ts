/**
 * The Lootspire — the tower screen (Brief §3.1–§3.4, UI_FANTASYUI_MAP §2).
 *
 * The whole game is one question asked over and over: *one more floor?* This
 * screen is where it gets asked, so it answers three things at a glance — where
 * you are, what is waiting on the next floor, and how far you have ever climbed.
 *
 * The trail deliberately shows the climb **ahead of you only** (Q23: the tower
 * runs strictly upward). Everything on it is therefore actionable: the floor you
 * are standing on is the fight, the floors above it you have cleared before are
 * Quick-Raid targets (Q8), and new ground is not clickable because there is no
 * way to reach it except by climbing. No node on this screen does nothing.
 */
import {
  BuffBar,
  Button,
  Panel,
  Portrait,
  SplitButton,
  StageTrail,
  StatChip,
  h,
  type SplitAction,
  type TrailChapter,
  type TrailNode,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { bandForFloor } from '@/content/floors/index.ts';
import type { Character } from '@/domain/character/types.ts';
import { generateFloor, type GeneratedFloor } from '@/domain/tower/floors.ts';
import { quickRaidCeiling } from '@/domain/tower/run.ts';
import type { StatId } from '@/domain/stats.ts';
import { effectChip, tipEffects } from '@/ui/combat/effectChips.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** How far ahead the trail draws. Enough to see the next boss and then some. */
const LOOK_AHEAD = 18;

/** The stats the preview hints at, in the order the reference screens use them. */
const PREVIEW_STATS: readonly StatId[] = ['strength', 'defense', 'hp', 'speed', 'luck'];

export interface TowerScreenOptions {
  character: Character;
  /** Fight the floor the hero is standing on. */
  onFight: (floor: number) => void;
  /** Quick-Raid every cleared floor up to and including `throughFloor` (Q8). */
  onRaid: (throughFloor: number) => void;
}

export interface TowerScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createTowerScreen(options: TowerScreenOptions): TowerScreen {
  const { character, onFight, onRaid } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const floor = character.tower.currentRunFloor;
  const highest = character.tower.highestFloorEverCleared;
  const ceiling = quickRaidCeiling(character);
  const canRaid = ceiling >= floor;
  const generated = generateFloor(character.tower.runSeed, floor);

  const trail = track(
    new StageTrail({
      title: t('tower.title'),
      chapters: buildChapters(character, floor, ceiling),
      height: '100%',
      spacing: 88,
      totalStars: 0,
      autoScroll: true,
      class: 'omf-tower__trail',
      // The band the hero is standing in paints the wall behind the path.
      style: { '--fui-tower-art': `var(--fui-img-${bandForFloor(floor).backdrop})` },
    }),
  );
  trail.on<TrailNode>('trail:select', (node) => {
    const target = Number(node.id.slice('floor:'.length));
    if (target === floor) onFight(floor);
    else if (target > floor && target <= ceiling) onRaid(target);
  });

  const preview = buildPreview(generated, track);

  const actions: SplitAction[] = canRaid
    ? [
        {
          id: 'raid',
          label: t('tower.quickRaid', { floor: ceiling }),
          glyph: 'glyph-hourglass',
          note: t('tower.quickRaidNote', { count: ceiling - floor + 1 }),
        },
      ]
    : [];

  const fightLabel = generated.isBoss
    ? t('tower.fightBoss', { floor })
    : t('tower.fight', { floor });

  let control: HTMLElement;
  if (actions.length > 0) {
    const split = track(
      new SplitButton({
        primary: { id: 'fight', label: fightLabel, glyph: 'glyph-crossed-swords' },
        actions,
        block: true,
        up: true,
      }),
    );
    split.on<SplitAction>('split:action', (action) => {
      if (action.id === 'fight') onFight(floor);
      else onRaid(ceiling);
    });
    control = split.el;
  } else {
    const button = track(
      new Button({
        label: fightLabel,
        icon: 'icon-sword',
        variant: 'primary',
        size: 'lg',
        block: true,
      }),
    );
    button.on('click', () => onFight(floor));
    control = button.el;
  }

  // The record lives as a chip in the panel's own flow rather than a ribbon
  // pinned over it: a corner banner covered the enemy's name.
  const best = track(
    new StatChip({
      label: t('tower.best'),
      value: highest > 0 ? highest : t('tower.highestNone'),
      glyph: 'glyph-trophy-cup',
      tone: highest > 0 ? 'gold' : 'neutral',
      size: 'sm',
    }),
  );

  const side = track(
    new Panel({
      title: t('tower.currentFloor', {
        floor,
        band: t(bandForFloor(floor).nameKey),
      }),
      variant: 'alt',
      width: '100%',
      height: '100%',
      content: [h('div', { class: 'omf-tower__record' }, best.el), preview],
      footer: [control],
    }),
  );

  const el = h(
    'div',
    { class: 'omf-tower', dataset: { fuiTheme: 'dark-ember', testid: 'tower' } },
    h('div', { class: 'omf-tower__path' }, trail.el),
    h('div', { class: 'omf-tower__side' }, side.el),
  );

  const releaseDrag = dragToScroll(trail.el.querySelector('.fui-trail__scroller'));

  return {
    el,
    destroy() {
      releaseDrag();
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** How far the pointer must travel before a press counts as a drag, in pixels. */
const DRAG_SLOP = 4;

/**
 * Grab the tower and pull it. A wheel works, but a path you can take hold of is
 * how a tower *feels* like a place rather than a list, and it is the first thing
 * a player tries on a scrolling illustration.
 *
 * The slop threshold is what keeps it honest: below it nothing has happened and
 * the press is still a click on whatever floor is under the cursor; past it the
 * scroller takes pointer capture and the click is swallowed, so a drag that
 * happens to end over a floor node never starts a fight nobody asked for.
 */
function dragToScroll(scroller: HTMLElement | null): () => void {
  if (!scroller) return () => {};

  let pointer: number | null = null;
  let startY = 0;
  let startTop = 0;
  let dragging = false;

  const down = (event: PointerEvent): void => {
    // Left button only, and never a drag that starts on a control.
    if (event.button !== 0) return;
    pointer = event.pointerId;
    startY = event.clientY;
    startTop = scroller.scrollTop;
    dragging = false;
  };

  const move = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    const travelled = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(travelled) < DRAG_SLOP) return;
      dragging = true;
      scroller.classList.add('is-dragging');
      scroller.setPointerCapture(event.pointerId);
    }
    scroller.scrollTop = startTop - travelled;
    event.preventDefault();
  };

  const end = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    if (dragging && scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    pointer = null;
    // The click that follows a drag belongs to the drag, not to a floor.
    if (dragging) scroller.addEventListener('click', swallow, { capture: true, once: true });
    dragging = false;
    scroller.classList.remove('is-dragging');
  };

  const swallow = (event: Event): void => {
    event.stopPropagation();
    event.preventDefault();
  };

  scroller.addEventListener('pointerdown', down);
  scroller.addEventListener('pointermove', move);
  scroller.addEventListener('pointerup', end);
  scroller.addEventListener('pointercancel', end);

  return () => {
    scroller.removeEventListener('pointerdown', down);
    scroller.removeEventListener('pointermove', move);
    scroller.removeEventListener('pointerup', end);
    scroller.removeEventListener('pointercancel', end);
    scroller.removeEventListener('click', swallow, { capture: true });
  };
}

/** The floors ahead, grouped by band, drawn highest-first so the tower goes up. */
function buildChapters(character: Character, floor: number, ceiling: number): TrailChapter[] {
  const top = floor + LOOK_AHEAD;
  const chapters: TrailChapter[] = [];

  for (let current = top; current >= floor; current -= 1) {
    const band = bandForFloor(current);
    const generated = generateFloor(character.tower.runSeed, current);
    const isCurrent = current === floor;
    const raidable = current > floor && current <= ceiling;

    // Only the floors that carry information are labelled: the one you are on,
    // the bosses ahead, and the ones a Quick-Raid can reach. Tagging the rest
    // "new ground" would repeat the same words twenty times down the path.
    const note = raidable
      ? t('tower.cleared')
      : generated.isBoss
        ? t('tower.bossFloor')
        : undefined;

    const node: TrailNode = {
      id: `floor:${current}`,
      label: String(current),
      kind: generated.isBoss ? 'boss' : 'battle',
      state: isCurrent ? 'current' : raidable ? 'open' : 'locked',
      ...(isCurrent || generated.isBoss ? { name: t(generated.enemy.nameKey) } : {}),
      ...(note ? { note } : {}),
    };

    const head = chapters[chapters.length - 1];
    if (head && head.id === band.id) head.nodes.push(node);
    else {
      chapters.push({
        id: band.id,
        title: t(band.nameKey),
        subtitle: t('tower.floor', { floor: band.from }),
        art: band.backdrop,
        nodes: [node],
      });
    }
  }

  return chapters;
}

/** The enemy waiting on this floor: who it is, roughly how hard, and what it brings. */
function buildPreview(
  generated: GeneratedFloor,
  track: <T extends FuiComponent>(component: T) => T,
): HTMLElement {
  const portrait = track(
    new Portrait({
      art: generated.enemy.avatar,
      shape: 'square',
      size: 128,
      fit: 'contain',
      name: t(generated.enemy.nameKey),
    }),
  );

  const chips = h(
    'div',
    { class: 'omf-tower__stats' },
    ...PREVIEW_STATS.map(
      (stat) =>
        track(
          new StatChip({
            label: t(`tower.stat.${stat}` as StringKey),
            value: generated.stats[stat],
            compact: true,
            size: 'sm',
          }),
        ).el,
    ),
  );

  const rows: HTMLElement[] = [
    h('h3', { class: 'omf-tower__preview-title fui-title', text: t(generated.enemy.nameKey) }),
    portrait.el,
    chips,
  ];

  if (generated.modifier) {
    rows.push(
      h('p', {
        class: 'omf-tower__modifier',
        text: t('tower.preview.modifier', { name: t(generated.modifier.nameKey) }),
      }),
    );
  }

  if (generated.effects.length > 0) {
    const bar = track(
      new BuffBar({
        buffs: generated.effects.map((applied) => effectChip(applied.effect)),
        size: 34,
        autoTick: false,
      }),
    );
    // The chips carry their own cards: what the effect does, to which number,
    // and for how long — the read that decides whether to drink first.
    tipEffects(
      bar.el,
      generated.effects.map((applied) => applied.effect),
    );
    rows.push(
      h('p', { class: 'omf-tower__effects-label', text: t('tower.preview.effects') }),
      bar.el,
    );
  } else {
    rows.push(h('p', { class: 'omf-tower__effects-label', text: t('tower.preview.noEffects') }));
  }

  return h('div', { class: 'omf-tower__preview', dataset: { testid: 'floor-preview' } }, ...rows);
}

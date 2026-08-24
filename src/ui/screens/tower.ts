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
import { CLASSES } from '@/content/classes/index.ts';
import { bandForFloor, bandRange, type FloorBand } from '@/content/floors/index.ts';
import { combatStatsOf } from '@/domain/character/character.ts';
import type { AutoClimbMode, Character } from '@/domain/character/types.ts';
import { generateFloor, type GeneratedFloor } from '@/domain/tower/floors.ts';
import { floorRewardEstimate } from '@/domain/tower/rewards.ts';
import { quickRaidCeiling } from '@/domain/tower/run.ts';
import {
  AUTO_CLIMB_FLOOR_DELAY_MS,
  AUTO_CLIMB_MODES,
  BACKGROUND_AUTO_CLIMB_LEVEL,
  canAutoClimb,
  effectiveMode,
} from '@/domain/tower/autoClimb.ts';
import { isMilestone, milestoneUnclaimed } from '@/domain/tower/milestones.ts';
import {
  CURSES,
  CURSE_UNLOCK_LEVEL,
  MAX_ACTIVE_CURSES,
  activeCurses,
  curseRewardMultiplier,
  cursesUnlocked,
} from '@/domain/tower/curses.ts';
import { MILESTONE_EVERY } from '@/content/balance/rewards.ts';
import type { StatBlock, StatId } from '@/domain/stats.ts';
import { effectChip, effectTooltip, tipEffects } from '@/ui/combat/effectChips.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** How far ahead the trail draws. Enough to see the next boss and then some. */
const LOOK_AHEAD = 18;

/**
 * The trail always climbs as far as the record when the record is this close,
 * so the ghost of your best climb is a place on the path you can see and walk
 * to rather than a number in a chip. Past this the path would be a scrollbar,
 * and the Quick-Raid is the honest way back anyway.
 */
const GHOST_REACH = 60;

/** The stats the preview hints at, in the order the reference screens use them. */
const PREVIEW_STATS: readonly StatId[] = ['strength', 'defense', 'hp', 'speed', 'luck'];

export interface TowerScreenOptions {
  character: Character;
  /** Wall-clock time, so the matchup counts draughts that are still running. */
  now: number;
  /** Fight the floor the hero is standing on. */
  onFight: (floor: number) => void;
  /** Quick-Raid every cleared floor up to and including `throughFloor` (Q8). */
  onRaid: (throughFloor: number) => void;
  /** Change what auto-climb is doing (Q32). */
  onAutoClimb: (mode: AutoClimbMode) => void;
  /** Take a curse, or lift one (Q35). */
  onCurse: (id: string) => void;
}

export interface TowerScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createTowerScreen(options: TowerScreenOptions): TowerScreen {
  const { character, now, onFight, onRaid, onAutoClimb, onCurse } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const floor = character.tower.currentRunFloor;
  const highest = character.tower.highestFloorEverCleared;
  const ceiling = quickRaidCeiling(character);
  const canRaid = ceiling >= floor;
  const generated = generateFloor(character.tower.runSeed, floor, character.curses);
  const current = effectiveMode(character);

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

  const preview = buildPreview(character, combatStatsOf(character, now), generated, track);

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

  /**
   * Auto-climb, under the button it replaces.
   *
   * A segmented picker rather than a checkbox: there are three states and two of
   * them are meaningfully different, so a control that could only say on or off
   * would be lying about one. A mode the hero has not unlocked is shown and
   * *disabled with a reason* rather than hidden — a player at level 40 should
   * know background climbing exists and what reaches it (Brief 20.5).
   */
  const auto = h('div', { class: 'omf-tower__auto', dataset: { testid: 'auto-climb' } });
  auto.appendChild(
    h('span', { class: 'omf-tower__auto-label fui-label', text: t('tower.auto.label') }),
  );

  const seconds = Math.round(AUTO_CLIMB_FLOOR_DELAY_MS / 1000);
  const modeRow = h('div', { class: 'omf-tower__auto-row' });
  for (const mode of AUTO_CLIMB_MODES) {
    const allowed = canAutoClimb(mode, character);
    const button = h('button', {
      class: 'omf-tower__auto-mode',
      attrs: { type: 'button' },
      dataset: { mode, testid: 'auto-' + mode },
      text: t(('tower.auto.' + mode) as StringKey),
    });
    if (mode === current) button.classList.add('is-on');
    if (!allowed) {
      button.disabled = true;
      setTip(button, t('tower.auto.lockedTip', { level: BACKGROUND_AUTO_CLIMB_LEVEL }));
    } else {
      setTip(button, t(('tower.auto.' + mode + 'Tip') as StringKey, { seconds }));
      button.addEventListener('click', () => onAutoClimb(mode));
    }
    modeRow.appendChild(button);
  }
  auto.appendChild(modeRow);

  /**
   * Curses — the one thing in the game that makes the tower harder on purpose.
   *
   * They live in the panel body under the preview rather than in the footer,
   * because the preview is already the place that says what the floor imposes
   * and what it pays, and a curse changes both. Below the unlock level the whole
   * block is shown with the level that opens it rather than hidden: a player
   * should know the choice exists long before they can make it (§20.5).
   */
  function buildCurses(): HTMLElement {
    const open = cursesUnlocked(character);
    const taken = new Set(activeCurses(character).map((curse) => curse.id));
    const full = taken.size >= MAX_ACTIVE_CURSES;

    const block = h('div', {
      class: 'omf-curses',
      dataset: { testid: 'curses', unlocked: String(open) },
    });
    block.appendChild(
      h(
        'div',
        { class: 'omf-curses__head' },
        h('span', { class: 'omf-curses__label fui-label', text: t('curse.title') }),
        h('span', {
          class: 'omf-curses__count',
          text: open
            ? t('curse.active', { count: taken.size, max: MAX_ACTIVE_CURSES })
            : t('curse.lockedChip', { level: CURSE_UNLOCK_LEVEL }),
        }),
      ),
    );

    const row = h('div', { class: 'omf-curses__row' });
    for (const curse of CURSES) {
      const on = taken.has(curse.id);
      const reward = Math.round((curseRewardMultiplier([curse.id]) - 1) * 100);
      const chip = h('button', {
        class: 'omf-curses__chip',
        attrs: { type: 'button' },
        dataset: { testid: `curse-${curse.id}`, on: String(on) },
        text: t(curse.nameKey),
      });
      if (on) chip.classList.add('is-on');

      // Lifting a curse is always allowed; taking one is what the gates guard.
      const allowed = on || (open && !full);
      if (!allowed) chip.disabled = true;
      else chip.addEventListener('click', () => onCurse(curse.id));

      setTip(chip, {
        title: t(curse.nameKey),
        subtitle: t('curse.reward', { percent: reward }),
        flavor: !open
          ? t('curse.locked', { level: CURSE_UNLOCK_LEVEL })
          : full && !on
            ? t('curse.full')
            : t(curse.descKey),
      });
      row.appendChild(chip);
    }

    block.appendChild(row);
    block.appendChild(h('p', { class: 'omf-curses__hint', text: t('curse.hint') }));
    return block;
  }

  const side = track(
    new Panel({
      title: t('tower.currentFloor', {
        floor,
        band: t(bandForFloor(floor).nameKey),
      }),
      variant: 'alt',
      width: '100%',
      height: '100%',
      content: [h('div', { class: 'omf-tower__record' }, best.el), preview, buildCurses()],
      footer: [control, auto],
    }),
  );

  const el = h(
    'div',
    { class: 'omf-tower', dataset: { fuiTheme: 'dark-ember', testid: 'tower' } },
    h('div', { class: 'omf-tower__path' }, trail.el),
    h('div', { class: 'omf-tower__side' }, side.el),
  );

  markTrail(trail.el, character, floor);

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
  const record = character.tower.highestFloorEverCleared;
  const top = Math.min(Math.max(floor + LOOK_AHEAD, record), floor + GHOST_REACH);
  const chapters: TrailChapter[] = [];

  for (let current = top; current >= floor; current -= 1) {
    const band = bandForFloor(current);
    const generated = generateFloor(character.tower.runSeed, current, character.curses);
    const isCurrent = current === floor;
    const raidable = current > floor && current <= ceiling;

    // Only the floors that carry information are labelled: the one you are on,
    // the bosses ahead, and the ones a Quick-Raid can reach. Tagging the rest
    // "new ground" would repeat the same words twenty times down the path.
    const milestone = isMilestone(current);
    // Only the floors that carry information are labelled. A milestone outranks
    // "cleared" because it is the one thing on the path that pays for arriving;
    // an elite outranks both, because it is the one thing that can kill you.
    const note = generated.isElite
      ? t('tower.eliteFloor')
      : milestone
        ? t('tower.milestone.node')
        : raidable
          ? t('tower.cleared')
          : generated.isBoss
            ? t('tower.bossFloor')
            : undefined;

    const node: TrailNode = {
      id: `floor:${current}`,
      label: String(current),
      kind: generated.isBoss ? 'boss' : 'battle',
      state: isCurrent ? 'current' : raidable ? 'open' : 'locked',
      ...(isCurrent || generated.isBoss || generated.isElite
        ? { name: t(generated.enemy.nameKey) }
        : {}),
      ...(note ? { note } : {}),
    };

    const head = chapters[chapters.length - 1];
    if (head && head.id === band.id) head.nodes.push(node);
    else {
      chapters.push({
        id: band.id,
        title: t(band.nameKey),
        subtitle: bandCaption(band),
        art: band.backdrop,
        nodes: [node],
      });
    }
  }

  return chapters;
}

/** "Floors 1–20", or "Floor 101 and above" for the band that never ends. */
function bandCaption(band: FloorBand): string {
  const [from, to] = bandRange(band);
  return to === null ? t('tower.band.rangeOpen', { from }) : t('tower.band.range', { from, to });
}

/**
 * The two things the path could not say for itself.
 *
 * `StageTrail` draws every stop as the same numbered disc, which on a tower
 * leaves a player scanning twenty identical circles for the one they are
 * standing on — and gives a boss floor no more warning than the corridor
 * outside it. Both are marks on the rendered node rather than options, because
 * the component takes neither; the boss's is a class, the hero's is their own
 * face, pinned to the disc they are on.
 */
function markTrail(root: HTMLElement, character: Character, floor: number): void {
  for (const node of root.querySelectorAll<HTMLElement>(".fui-trail__node[data-kind='boss']")) {
    node.classList.add('omf-tower__boss');
    setTip(node, t('tower.bossTip'));
  }

  /**
   * Milestone chests, and the line the record stands on.
   *
   * `StageTrail` has no per-node hook, so both are found by the label the node
   * carries — the floor number, which is the one thing on a tower node that is
   * guaranteed unique and stable.
   */
  const record = character.tower.highestFloorEverCleared;
  for (const node of root.querySelectorAll<HTMLElement>('.fui-trail__node')) {
    const label = node.querySelector('.fui-trail__num')?.textContent;
    const at = Number(label);
    if (!Number.isFinite(at)) continue;

    // An elite is worth seeing from the bottom of the screen (Q44). Its own
    // stream decides it, so asking the generator again is free and exact.
    if (generateFloor(character.tower.runSeed, at, character.curses).isElite) {
      node.classList.add('omf-tower__elite');
      setTip(node, t('tower.eliteTip'));
    }

    if (isMilestone(at)) {
      node.classList.add('omf-tower__milestone');
      if (!milestoneUnclaimed(character, at)) node.classList.add('is-taken');
      setTip(
        node,
        milestoneUnclaimed(character, at)
          ? t('tower.milestone.tip', { every: MILESTONE_EVERY })
          : t('tower.milestone.claimed'),
      );
    }

    /**
     * The ghost of your best.
     *
     * Everything above this line is ground nobody has stood on, and a climber
     * with no marker for that has nothing to aim at but a number in the rail.
     * It is drawn on the record floor itself rather than between floors so it
     * reads as "you got *here*" rather than as a fence.
     */
    if (record > 0 && at === record) {
      node.classList.add('omf-tower__record-mark');
      const ghost = h('span', {
        class: 'omf-tower__ghost',
        dataset: { testid: 'best-floor-ghost' },
        text: t('tower.ghost'),
      });
      node.appendChild(ghost);
      setTip(node, t('tower.ghostTip', { floor: record }));
    }
  }

  const current = root.querySelector<HTMLElement>(".fui-trail__node[data-state='current']");
  if (!current) return;
  const marker = h('span', {
    class: 'omf-tower__here',
    dataset: { testid: 'tower-here' },
    style: {
      backgroundImage: `var(--fui-img-${CLASSES[character.identity.classId].art.portrait})`,
    },
    attrs: { 'aria-hidden': 'true' },
  });
  current.appendChild(marker);
  setTip(current, t('tower.hereTip', { floor }));
}

/**
 * What is waiting on this floor, and whether you can take it.
 *
 * The first pass showed the enemy's five stats as chips and left it there,
 * which is half an answer: a number means nothing without the number it is
 * being measured against. A player standing on a floor is asking one question —
 * *can I take this?* — and the honest way to answer it is to put both sides of
 * the fight next to each other and let them read it.
 *
 * The panel is tall, so it is laid out to be tall: the matchup at the top, the
 * stat-by-stat comparison filling the middle, and what the floor imposes at the
 * bottom, right above the button that commits to it.
 */
function buildPreview(
  character: Character,
  hero: StatBlock,
  generated: GeneratedFloor,
  track: <T extends FuiComponent>(component: T) => T,
): HTMLElement {
  const heroPortrait = track(
    new Portrait({
      art: CLASSES[character.identity.classId].art.portrait,
      shape: 'square',
      size: 84,
      fit: 'cover',
      name: character.identity.name,
    }),
  );

  const enemyPortrait = track(
    new Portrait({
      art: generated.enemy.avatar,
      shape: 'square',
      size: 84,
      fit: 'contain',
      name: t(generated.enemy.nameKey),
    }),
  );

  const face = (portrait: Portrait, name: string, note: string): HTMLElement =>
    h(
      'div',
      { class: 'omf-tower__face' },
      portrait.el,
      h('span', { class: 'omf-tower__face-name fui-title', text: name }),
      h('span', { class: 'omf-tower__face-note', text: note }),
    );

  const matchup = h(
    'div',
    { class: 'omf-tower__matchup' },
    face(heroPortrait, character.identity.name, t(CLASSES[character.identity.classId].nameKey)),
    h('span', { class: 'omf-tower__vs-mark fui-title', text: 'VS' }),
    face(
      enemyPortrait,
      t(generated.enemy.nameKey),
      generated.isBoss
        ? t('tower.bossFloor')
        : generated.isElite
          ? t('tower.preview.elite')
          : t('tower.floor', { floor: generated.floor }),
    ),
  );
  if (generated.isElite) matchup.dataset['elite'] = 'true';

  const rows: HTMLElement[] = [
    matchup,
    buildCompare(hero, generated),
    buildPays(generated, character.curses ?? [], track),
    buildThreats(generated, track),
  ];

  return h('div', { class: 'omf-tower__preview', dataset: { testid: 'floor-preview' } }, ...rows);
}

/**
 * Five stats, both sides, one bar apiece.
 *
 * The bar is a tug-of-war rather than two bars side by side: each stat is
 * normalised against the pair's own total, so a stat where the numbers differ by
 * an order of magnitude (health) reads exactly as clearly as one where they
 * differ by two points (speed). The numbers are still printed, because a bar is
 * an impression and a fight is decided by arithmetic.
 */
function buildCompare(hero: StatBlock, generated: GeneratedFloor): HTMLElement {
  let ahead = 0;

  const rows = PREVIEW_STATS.map((stat) => {
    const mine = hero[stat];
    const theirs = generated.stats[stat];
    const total = mine + theirs;
    // A stat neither side has cannot be led on, and 0/0 has no split to draw.
    const share = total > 0 ? (mine / total) * 100 : 50;
    const lead = mine > theirs ? 'you' : mine < theirs ? 'them' : 'level';
    if (lead === 'you') ahead += 1;

    const row = h(
      'div',
      { class: 'omf-tower__cmp', dataset: { lead } },
      h('span', { class: 'omf-tower__cmp-mine fui-num', text: String(mine) }),
      h('span', { class: 'omf-tower__cmp-label', text: t(`tower.stat.${stat}` as StringKey) }),
      h('span', { class: 'omf-tower__cmp-theirs fui-num', text: String(theirs) }),
      h(
        'span',
        { class: 'omf-tower__cmp-bar', style: { '--omf-share': `${share.toFixed(1)}%` } },
        h('span', { class: 'omf-tower__cmp-fill' }),
      ),
    );

    setTip(
      row,
      t('tower.preview.statTip', {
        stat: t(`stat.${stat}` as StringKey),
        you: mine,
        them: theirs,
        verdict:
          lead === 'you'
            ? t('tower.preview.ahead')
            : lead === 'them'
              ? t('tower.preview.behind')
              : t('tower.preview.level'),
      }),
    );
    return row;
  });

  return h(
    'section',
    { class: 'omf-tower__compare', dataset: { testid: 'floor-matchup' } },
    h(
      'header',
      { class: 'omf-tower__compare-head' },
      h('span', { class: 'omf-tower__compare-side fui-label', text: t('tower.preview.you') }),
      h('span', {
        class: 'omf-tower__compare-title fui-label',
        text: t('tower.preview.leads', { count: ahead, total: PREVIEW_STATS.length }),
      }),
      h('span', { class: 'omf-tower__compare-side fui-label', text: t('tower.preview.them') }),
    ),
    ...rows,
  );
}

/**
 * What clearing it is worth.
 *
 * A boss is several floors' pay in one fight, and until now nothing said so
 * before the fight — the player found out in the aftermath. The figures are the
 * reward curves with the dice left out (`floorRewardEstimate`), so the preview
 * cannot drift from what the floor actually hands over.
 */
function buildPays(
  generated: GeneratedFloor,
  curses: readonly string[],
  track: <T extends FuiComponent>(component: T) => T,
): HTMLElement {
  const estimate = floorRewardEstimate(
    generated.floor,
    generated.isBoss,
    curses,
    generated.isElite,
  );
  const percent = Math.round(estimate.itemChance * 100);

  const chip = (label: string, value: string, glyph: string): HTMLElement =>
    track(new StatChip({ label, value, glyph, size: 'sm', tone: 'gold' })).el;

  const strip = h(
    'div',
    { class: 'omf-tower__pays', dataset: { testid: 'floor-pays' } },
    h('span', { class: 'omf-tower__effects-label fui-label', text: t('tower.preview.pays') }),
    h(
      'div',
      { class: 'omf-tower__pays-row' },
      chip(
        t('currency.gold'),
        t('tower.preview.paysGold', { gold: estimate.gold }),
        'glyph-trophy-cup',
      ),
      chip(
        t('tower.preview.xp'),
        t('tower.preview.paysXp', { xp: estimate.xp }),
        'glyph-shooting-stars',
      ),
      chip(
        t('tower.preview.gear'),
        t('tower.preview.paysGear', { percent }),
        'glyph-crossed-swords',
      ),
    ),
  );
  setTip(strip, t('tower.preview.paysTip', { gold: estimate.gold, xp: estimate.xp, percent }));
  return strip;
}

/**
 * What the floor does to you before the first blow (Brief §3.2).
 *
 * Each effect is named beside its chip rather than left as a bare icon: a row of
 * unlabelled squares is a puzzle, and the whole point of stating this before the
 * fight is that the player can act on it — drink something, or walk away.
 */
function buildThreats(
  generated: GeneratedFloor,
  track: <T extends FuiComponent>(component: T) => T,
): HTMLElement {
  const rows: HTMLElement[] = [
    h('h3', { class: 'omf-tower__effects-label fui-label', text: t('tower.preview.effects') }),
  ];

  if (generated.modifier) {
    rows.push(
      h('p', {
        class: 'omf-tower__modifier',
        text: t('tower.preview.modifier', { name: t(generated.modifier.nameKey) }),
      }),
    );
  }

  if (generated.effects.length === 0) {
    rows.push(h('p', { class: 'omf-tower__effects-none', text: t('tower.preview.noEffects') }));
  } else {
    for (const applied of generated.effects) {
      const chip = track(
        new BuffBar({ buffs: [effectChip(applied.effect)], size: 30, autoTick: false }),
      );
      const name = h('span', {
        class: 'omf-tower__threat-name',
        text: t(applied.effect.nameKey as StringKey),
      });
      const row = h('div', { class: 'omf-tower__threat' }, chip.el, name);

      // The card carries what it does, to which number, and for how long — the
      // read that decides whether to drink first. It goes on the chip as well as
      // the row: `BuffBar` writes its own `title` on each chip, and the tooltip
      // service serves the *closest* tip to the cursor, so a card left on the
      // row alone would be shadowed by the component's one-line summary.
      tipEffects(chip.el, [applied.effect]);
      setTip(name, effectTooltip(applied.effect));
      setTip(row, effectTooltip(applied.effect));
      rows.push(row);
    }
  }

  return h('section', { class: 'omf-tower__threats' }, ...rows);
}

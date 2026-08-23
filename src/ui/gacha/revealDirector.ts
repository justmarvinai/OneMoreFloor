/**
 * `GachaRevealDirector` — the §16.3 set-piece (UI_FANTASYUI_MAP §10, allowlist 2).
 *
 * The brief is unusually direct about this one: the animation "is not
 * decoration; it is one of the reasons the player keeps playing", and it has to
 * be good enough that finding a Ticket reads as *finally, I can pull again*.
 *
 * So it is staged as an event, not a transition: the game is covered, the
 * chamber goes dark, a summoning circle wakes, the light climbs and **dies back**
 * — more than once when the rite is bluffing — and only then does the prize land
 * on a lit plinth. The escalation is one number (`charge`) driving the circle,
 * the plinth's light and the flash together, exactly so the extremes cannot end
 * up mismatched.
 *
 * Like `CombatStage`, this is a dumb performer: `riteBeats()` already decided
 * the schedule, and everything here only plays it. It owns exactly one timer at
 * a time, cleared on skip and on destroy — a leaked one would keep animating
 * over a screen the player already left.
 */
import {
  Button,
  FloatingText,
  ImpactFrame,
  Pedestal,
  RuneCircle,
  SceneBackdrop,
  Slot,
  h,
} from '@/ui/fui/index.ts';
import type { FuiComponent, SlotItem } from '@/ui/fui/index.ts';
import { bannerConfig } from '@/content/balance/gacha.ts';
import { getMaterial } from '@/content/items/materials.ts';
import type { PullResult } from '@/domain/gacha/gacha.ts';
import { itemName, itemSlot, statLine } from '@/ui/itemView.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';
import { outcomeRank, riteBeats, type RiteBeat } from './riteChoreography.ts';

export interface RevealDirectorOptions {
  mount: HTMLElement;
  result: PullResult;
  /** True when the player can afford another pull the moment this one lands. */
  canRepeat: boolean;
  onAgain: () => void;
  onClose: () => void;
}

export interface RevealDirector {
  el: HTMLElement;
  /** Jump straight to the answer. The outcome is already decided either way. */
  skip(): void;
  destroy(): void;
}

/** How many motes drift through the circle at each rank — light escalating. */
const MOTES = [6, 8, 12, 18, 26, 36];

export function startReveal(options: RevealDirectorOptions): RevealDirector {
  const { mount, result, canRepeat, onAgain, onClose } = options;
  const banner = bannerConfig(result.banner);
  const beats = riteBeats(result);

  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  let index = 0;
  let finished = false;
  let destroyed = false;

  const circle = track(
    new RuneCircle({
      size: 320,
      color: banner.accent,
      charge: 0,
      sides: 6,
      rings: [
        { at: 1, glyphs: [banner.currencyGlyph, 'glyph-arcane-symbol'], spin: 64, line: true },
        { at: 0.8, ticks: 18, spin: -42, line: true },
        { at: 0.58, ticks: 30, spin: 28 },
      ],
    }),
  );

  const plinth = track(
    new Pedestal({
      height: 300,
      width: 320,
      base: 'arcane',
      turning: true,
      // Motes are built once, at construction, so they are sized to the prize
      // that is actually coming — the plinth is hidden until the reveal, and
      // the build's escalation is carried by the circle and the flash instead.
      motes: MOTES[outcomeRank(result)] ?? MOTES[0],
      rarity: result.rarity ?? 'common',
      ...(result.rarity ? {} : { color: banner.accent }),
    }),
  );
  plinth.el.classList.add('omf-rite__plinth');

  const flash = track(new ImpactFrame({ tone: 'crit', power: 0.5, lines: true }));
  const floats = track(new FloatingText());

  const caption = h('p', { class: 'omf-rite__caption', dataset: { testid: 'rite-caption' } });
  /**
   * The circle's own light, spilling into the chamber. One element driven by
   * one custom property, so the glow, the rune rings and the caption all rise
   * on the same number rather than three that have to be kept in agreement.
   */
  const glow = h('span', { class: 'omf-rite__glow', attrs: { 'aria-hidden': 'true' } });
  const stage = h('div', { class: 'omf-rite__stage' }, glow, circle.el, plinth.el, floats.el);
  // The flash covers the whole chamber, not the plinth's cell — a burst with a
  // visible edge is a rectangle with an animation on it, not an event.
  flash.el.classList.add('omf-rite__flash');

  const skipButton = track(new Button({ label: t('gacha.rite.skip'), variant: 'ghost' }));
  skipButton.on('click', () => skip());

  const takeButton = track(new Button({ label: t('gacha.rite.done'), variant: 'primary' }));
  takeButton.on('click', () => close());

  const againButton = track(new Button({ label: t('gacha.rite.again'), variant: 'ghost' }));
  againButton.on('click', () => {
    teardown();
    onAgain();
  });

  const actions = h('div', { class: 'omf-rite__actions' }, skipButton.el);

  const chamber = track(
    new SceneBackdrop({
      // The art is barely there on purpose: the circle has to be the brightest
      // thing in the room, and a legible painting behind it competes with the
      // one object the player is meant to be staring at.
      layers: [{ art: banner.art, fit: 'cover', opacity: 0.32, blur: 4 }],
      height: '100%',
      scrim: 0.78,
      vignette: 0.85,
      drift: true,
      content: h('div', { class: 'omf-rite__body' }, stage, caption, actions),
    }),
  );

  const el = h(
    'div',
    {
      class: 'omf-rite',
      dataset: { fuiTheme: 'dark-ember', testid: 'rite', phase: 'build' },
      style: { '--omf-rite-ink': banner.accent },
    },
    chamber.el,
    flash.el,
  );
  mount.appendChild(el);

  /** Play one beat, then schedule the next. */
  function step(): void {
    if (destroyed) return;
    const beat = beats[index];
    if (!beat) {
      land();
      return;
    }
    index += 1;
    perform(beat);
    timer = setTimeout(step, beat.duration);
  }

  function perform(beat: RiteBeat): void {
    switch (beat.kind) {
      case 'open':
        el.dataset['phase'] = 'build';
        return;

      case 'charge':
      case 'tease':
        setCharge(beat.charge);
        caption.textContent = t(beat.captionKey);
        // Rank drives the plinth's tint as the light climbs, so the *colour*
        // rises with the tension rather than appearing only at the reveal.
        if (beat.kind === 'tease') paintRank(beat.rank);
        return;

      case 'fade':
        setCharge(beat.charge);
        // The caption goes quiet as the light falls: the silence is the
        // fake-out, and a caption still shouting through it would spoil it.
        caption.textContent = '';
        return;

      case 'break':
        setCharge(1);
        // The frame stamps the word across the screen, so the caption would
        // only be the same sentence printed twice.
        caption.textContent = '';
        flash.setTone('crit', 0.4 + beat.rank * 0.12).play(t(beat.captionKey));
        return;

      case 'reveal':
        el.dataset['phase'] = 'reveal';
        paintRank(beat.rank);
        plinth.setRarity(result.rarity ?? 'common');
        plinth.setContent(prize());
        caption.textContent = t(beat.captionKey);
        // The light takes the prize's colour, not the banner's: a Legendary
        // reads orange even on the violet rite (§16.3's per-tier language).
        if (result.rarity) {
          el.style.setProperty('--omf-rite-ink', `var(--fui-rarity-${result.rarity})`);
        }
        // Only the top two tiers get a second burst. Firing one on every pull
        // would spend the loudest thing the screen owns on an ordinary night.
        if (beat.rank >= 4) flash.setTone('crit', 1).play(t(beat.captionKey));
        announce();
        return;

      case 'settle':
        land();
    }
  }

  /** The buttons the player actually needs once the prize is on the plinth. */
  function land(): void {
    if (finished || destroyed) return;
    finished = true;
    el.dataset['phase'] = 'reveal';
    actions.replaceChildren(takeButton.el, ...(canRepeat ? [againButton.el] : []));
    // Said plainly rather than implied: the reward was banked before the
    // animation began, so closing the tab mid-rite loses nothing.
    setTip(takeButton.el, t('gacha.rite.banked'));
  }

  /** One number for the whole chamber's light level. */
  function setCharge(charge: number): void {
    circle.setCharge(charge);
    el.style.setProperty('--omf-rite-charge', charge.toFixed(3));
  }

  function paintRank(rank: number): void {
    circle.el.dataset['rank'] = String(rank);
    plinth.el.dataset['rank'] = String(rank);
    el.dataset['rank'] = String(rank);
  }

  /** What is standing on the plinth: the gear, the purse, or the ore. */
  function prize(): HTMLElement {
    if (result.item) {
      // Rendered through the game's one item standard (§9), so the piece that
      // came out of the circle reads identically to the same piece in the
      // backpack a second later.
      const slot = track(new Slot({ item: itemSlot(result.item), size: 132 }));
      setTip(slot.el, statLine(result.item));
      return h(
        'div',
        { class: 'omf-rite__prize' },
        slot.el,
        h('p', { class: 'omf-rite__prizeName fui-title', text: itemName(result.item) }),
      );
    }

    if (result.reward.gold > 0) {
      return bundle(
        { icon: 'icon-coins', name: t('currency.gold'), rarity: 'rare' },
        t('gacha.rite.gold', { gold: result.reward.gold }),
      );
    }

    const [id, count] = Object.entries(result.reward.materials)[0] ?? ['', 0];
    const material = getMaterial(id);
    return bundle(
      {
        icon: material?.icon ?? 'icon-sack',
        name: material ? t(material.nameKey as StringKey) : '',
        rarity: 'uncommon',
        qty: count,
      },
      t('gacha.rite.materials', {
        count,
        name: material ? t(material.nameKey as StringKey) : '',
      }),
    );
  }

  /** The non-gear prizes, framed the same way gear is. */
  function bundle(item: SlotItem, label: string): HTMLElement {
    return h(
      'div',
      { class: 'omf-rite__prize' },
      track(new Slot({ item, size: 132 })).el,
      h('p', { class: 'omf-rite__prizeName fui-title', text: label }),
    );
  }

  /** A number worth seeing leave the circle, for the payouts that have one. */
  function announce(): void {
    if (result.reward.gold > 0) {
      floats.spawnAt(plinth.el, { value: result.reward.gold, kind: 'gold', icon: 'icon-coins' });
    }
  }

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  /** Skip runs the beats that *change* something, then lands — never a cut. */
  function skip(): void {
    clearTimer();
    for (let rest = index; rest < beats.length; rest += 1) {
      const beat = beats[rest];
      if (beat && (beat.kind === 'reveal' || beat.kind === 'settle')) perform(beat);
    }
    index = beats.length;
    land();
  }

  function teardown(): void {
    if (destroyed) return;
    destroyed = true;
    clearTimer();
    for (const part of parts) part.destroy();
    el.remove();
  }

  function close(): void {
    teardown();
    onClose();
  }

  step();

  return {
    el,
    skip,
    destroy: teardown,
  };
}

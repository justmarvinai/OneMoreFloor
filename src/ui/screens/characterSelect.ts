/**
 * Character select — the one place characters are switched (Q2).
 *
 * Five cards, one per slot, in a fixed order so a hero is always where the player
 * left them. Each card says what it is without the player having to click it: a
 * hero with their level and best floor, an empty slot inviting a new one, a
 * locked slot naming what unlocks it, or a damaged slot saying plainly that
 * nothing was deleted (SAVE_SCHEMA §6).
 *
 * The screen it sits on is ours, and it had four things wrong with it. It
 * rendered onto flat black. Every slot that held no hero was a blank grey
 * rectangle, so four fifths of the roster was empty boxes. A locked slot's
 * unlock hint wrapped to two lines and grew *up* through the slot's own name,
 * because the component pins both to the card's bottom edge — the collision in
 * the screenshot. And Reset sat in the far corner of the window, a button that
 * erases a hero nowhere near the hero it erases.
 *
 * So: a lit backdrop, painted art on every state, the name and the hint given
 * room apiece, and Reset moved into the detail column beside its hero.
 *
 * Two of those need the rendered card, not the options that made it, because
 * `CharacterSelect` takes no per-card class and paints its role glyph as an
 * image (line glyphs are `currentColor` masks, so as an image each one is a
 * black smudge). `decorate()` is that pass. It runs again after every
 * selection: `select()` rebuilds both columns, which drops anything we added.
 */
import { Button, CharacterSelect, h } from '@/ui/fui/index.ts';
import type { CharacterClass } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import type { Screen } from '@/app/router.ts';
import type { AppStore, SlotView } from '@/app/state.ts';
import type { SlotId } from '@/domain/character/types.ts';
import { t } from '@/strings/index.ts';

export interface CharacterSelectScreenOptions {
  store: AppStore;
  onPlay: (slotId: SlotId) => void;
  onCreate: (slotId: SlotId) => void;
  onReset: (slotId: SlotId) => void;
}

/**
 * What a slot with no hero in it shows.
 *
 * An empty slot gets the pack's warrior silhouette — an outline waiting to be
 * filled, which is exactly what the slot is — and the stylesheet lifts it to a
 * pale ghost. The other two get painted marks rather than silhouettes, because
 * neither is a hero-shaped absence: one is sealed, one is broken.
 */
const SLOT_ART = {
  empty: 'silhouette-warrior-m',
  locked: 'rune-sealed-ring',
  damaged: 'rune-fractured-stone',
} as const;

function cardFor(slot: SlotView): CharacterClass {
  const id = String(slot.slotId);

  if (slot.summary) {
    const definition = CLASSES[slot.summary.classId];
    const floor = slot.summary.highestFloorEverCleared;
    return {
      id,
      name: slot.summary.name,
      tagline: t('select.slot.summary', {
        level: slot.summary.level,
        className: t(definition.nameKey),
      }),
      description: floor > 0 ? t('select.slot.floor', { floor }) : t('select.slot.neverClimbed'),
      art: definition.art.portrait,
      icon: definition.art.glyph,
    };
  }

  if (slot.state === 'damaged') {
    return {
      id,
      name: t('select.slot.damaged.name'),
      locked: true,
      lockHint: t('select.slot.damaged.hint'),
      art: SLOT_ART.damaged,
      icon: 'glyph-cursed-eye',
    };
  }

  if (slot.state === 'locked') {
    return {
      id,
      name: t('select.slot.locked.name'),
      locked: true,
      lockHint: t('select.slot.locked.hint'),
      art: SLOT_ART.locked,
      icon: 'glyph-broken-shackle',
    };
  }

  return {
    id,
    name: t('select.slot.empty.name'),
    tagline: t('select.slot.empty.tagline'),
    art: SLOT_ART.empty,
    icon: 'glyph-celestial-body',
  };
}

export function createCharacterSelectScreen(options: CharacterSelectScreenOptions): Screen {
  const { store, onPlay, onCreate, onReset } = options;
  const parts: FuiComponent[] = [];

  const slots = store.get().slots;
  const picker = new CharacterSelect({
    title: t('select.title'),
    classes: slots.map(cardFor),
    confirmLabel: t('select.confirm'),
    fullscreen: true,
    // The component paints whatever art it is handed behind the roster; handed
    // nothing, it paints black, which is what made this read as a placeholder.
    style: { '--fui-backdrop-img': 'var(--fui-img-bg-scene-dark)' },
  });
  parts.push(picker);

  let selected: SlotId = slots.find((slot) => slot.state === 'occupied')?.slotId ?? 1;

  const resetButton = new Button({
    label: t('select.reset'),
    variant: 'ghost',
    class: 'omf-danger',
  });
  parts.push(resetButton);
  resetButton.on('click', () => onReset(selected));

  /** Reset lives *in* the detail column, under the hero it would erase. */
  const actions = h('div', { class: 'omf-select__actions' }, resetButton.el);

  /**
   * Everything about the rendered roster that the component's options cannot
   * say. Idempotent, because it runs again on every selection.
   */
  const decorate = (): void => {
    const cards = picker.el.querySelectorAll<HTMLElement>('.fui-charsel__card');
    slots.forEach((slot, index) => {
      const card = cards[index];
      if (!card) return;
      // Occupied cards carry a portrait; the rest carry a stand-in that has to
      // be lit differently. One attribute lets the stylesheet tell them apart.
      card.dataset.slotState = slot.state;

      // A line glyph is a `currentColor` mask, so painted as an image it comes
      // out black on black. Moved into `mask-image` it becomes a lit mark.
      const role = card.querySelector<HTMLElement>('.fui-charsel__role');
      const image = role?.style.backgroundImage;
      if (role && image && image !== 'none') {
        role.style.backgroundImage = '';
        role.style.maskImage = image;
        role.style.webkitMaskImage = image;
      }
    });

    // `renderDetail()` clears the column it rebuilds, so Reset has to be put
    // back after every selection — appending it once only survives until the
    // player clicks a card.
    const detail = picker.el.querySelector('.fui-charsel__detail');
    (detail ?? picker.el).appendChild(actions);
  };

  const syncActions = (): void => {
    const slot = slots.find((entry) => entry.slotId === selected);
    // Reset only means something for a slot that holds a hero. The whole row
    // goes, not just the button: the row carries the rule above it, and a
    // divider with nothing under it is a panel that looks unfinished.
    actions.hidden = slot?.state !== 'occupied';
  };

  decorate();
  syncActions();

  picker.on<CharacterClass | undefined>('character:select', (card) => {
    if (!card) return;
    selected = Number(card.id) as SlotId;
    decorate();
    syncActions();
  });

  picker.on<CharacterClass | undefined>('character:confirm', (card) => {
    if (!card) return;
    const slotId = Number(card.id) as SlotId;
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) return;
    if (slot.state === 'occupied') onPlay(slotId);
    else if (slot.state === 'empty') onCreate(slotId);
    // Locked and damaged slots do nothing: the card already says why.
  });

  const el = h(
    'div',
    { class: 'omf-select', dataset: { fuiTheme: 'stone-vine', testid: 'character-select' } },
    picker.el,
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** Exported for the card-rendering tests, which cover the four slot states. */
export { cardFor as slotCardFor };

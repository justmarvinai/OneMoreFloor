/**
 * Character select — the one place characters are switched (Q2).
 *
 * Five cards, one per slot, in a fixed order so a hero is always where the player
 * left them. Each card says what it is without the player having to click it: a
 * hero with their level and best floor, an empty slot inviting a new one, a
 * locked slot naming what unlocks it, or a damaged slot saying plainly that
 * nothing was deleted (SAVE_SCHEMA §6).
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
      icon: 'glyph-cursed-eye',
    };
  }

  if (slot.state === 'locked') {
    return {
      id,
      name: t('select.slot.locked.name'),
      locked: true,
      lockHint: t('select.slot.locked.hint'),
      icon: 'glyph-broken-shackle',
    };
  }

  return {
    id,
    name: t('select.slot.empty.name'),
    tagline: t('select.slot.empty.tagline'),
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

  const actions = h('div', { class: 'omf-select__actions' }, resetButton.el);

  const syncActions = (): void => {
    const slot = slots.find((entry) => entry.slotId === selected);
    // Reset only means something for a slot that holds a hero.
    resetButton.el.hidden = slot?.state !== 'occupied';
  };
  syncActions();

  picker.on<CharacterClass | undefined>('character:select', (card) => {
    if (!card) return;
    selected = Number(card.id) as SlotId;
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
    actions,
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

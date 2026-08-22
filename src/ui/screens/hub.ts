/**
 * The hub shell — the frame the whole game lives inside.
 *
 * Layout follows the reference screenshots (Brief §20.3, UI_FANTASYUI_MAP §1):
 * a persistent left rail carrying the hero, their currencies and the navigation,
 * beside a large main panel that swaps as the player moves around.
 *
 * The rail now shows the character actually being played. Its destinations stay
 * disabled until the milestone that builds each one — nothing here pretends to
 * work (Brief §2.1).
 */
import {
  Button,
  CurrencyBar,
  EmptyState,
  Panel,
  Portrait,
  SideNav,
  StatBar,
  h,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { xpToNextLevel } from '@/domain/progression/xp.ts';
import type { Screen } from '@/app/router.ts';
import type { AppStore } from '@/app/state.ts';
import { t } from '@/strings/index.ts';

/** Rail destinations. Each is enabled by the milestone that builds its screen. */
const NAV_ITEMS = [
  { id: 'tower', label: t('nav.section.tower'), glyph: 'glyph-crossed-swords', disabled: true },
  {
    id: 'character',
    label: t('nav.section.character'),
    glyph: 'glyph-cloaked-figure',
    disabled: true,
  },
  {
    id: 'merchants',
    label: t('nav.section.merchants'),
    glyph: 'glyph-burning-scroll',
    disabled: true,
  },
  { id: 'quests', label: t('nav.section.quests'), glyph: 'glyph-arcane-symbol', disabled: true },
];

export interface HubScreenOptions {
  store: AppStore;
  /** Leave this character and go back to the select screen (Q2). */
  onSwitch: () => void;
}

export function createHubScreen(options: HubScreenOptions): Screen {
  const { store, onSwitch } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const character = store.get().activeCharacter;
  const definition = character ? CLASSES[character.identity.classId] : null;

  const portrait = track(
    new Portrait({
      art: definition?.art.portrait ?? 'silhouette-warrior-m',
      shape: 'square',
      size: 96,
      fit: 'cover',
      name: character?.identity.name,
      level: character?.progression.level,
    }),
  );

  const xp = track(
    new StatBar({
      kind: 'xp',
      value: character?.progression.xp ?? 0,
      max: character
        ? xpToNextLevel(character.progression.level, character.progression.ascension)
        : 100,
      readout: 'none',
      width: '100%',
    }),
  );

  const currencies = track(
    new CurrencyBar({
      currencies: [
        { id: 'gold', icon: 'icon-coins', amount: character?.currencies.gold ?? 0, label: 'Gold' },
      ],
      format: 'short',
    }),
  );

  const nav = track(new SideNav({ items: NAV_ITEMS, variant: 'full', fill: true }));

  const switchButton = track(new Button({ label: t('select.switch'), variant: 'ghost' }));
  switchButton.on('click', () => onSwitch());

  const placeholder = track(
    new EmptyState({
      glyph: 'glyph-celestial-body',
      title: t('hub.placeholder.title'),
      message: t('hub.placeholder.message'),
    }),
  );

  const saveStatus = h('p', {
    class: 'omf-save-status',
    dataset: { testid: 'save-status' },
    text: saveStatusText(store),
  });

  const main = track(
    new Panel({
      title: character ? character.identity.name : t('app.title'),
      subtitle: definition ? t(definition.taglineKey) : undefined,
      variant: 'default',
      width: '100%',
      height: '100%',
      content: [placeholder.el, saveStatus],
    }),
  );

  const el = h(
    'div',
    { class: 'omf-shell', dataset: { fuiTheme: 'stone-vine', testid: 'hub' } },
    h(
      'aside',
      { class: 'omf-shell__rail' },
      h('div', { class: 'omf-shell__hero' }, portrait.el, xp.el),
      currencies.el,
      nav.el,
      switchButton.el,
    ),
    h('main', { class: 'omf-shell__main' }, main.el),
  );

  const unsubscribe = store.select(
    (state) => state.save,
    () => {
      saveStatus.textContent = saveStatusText(store);
    },
  );

  return {
    el,
    destroy() {
      unsubscribe();
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

function saveStatusText(store: AppStore): string {
  const save = store.get().save;
  if (!save) return '';
  switch (save.status) {
    case 'created':
      return t('save.status.created');
    case 'migrated':
      return t('save.status.migrated');
    case 'recovered':
      return t('save.status.recovered', {
        when: save.recoveredFrom ? new Date(save.recoveredFrom).toLocaleString() : '—',
      });
    case 'corrupt':
      return t('save.status.corrupt');
    case 'loaded':
    case 'absent':
      return t('save.status.loaded');
  }
}

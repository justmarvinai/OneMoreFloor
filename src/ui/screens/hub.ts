/**
 * The hub shell — the frame the whole game lives inside.
 *
 * Layout follows the reference screenshots (Brief §20.3, UI_FANTASYUI_MAP §1):
 * a persistent left rail carrying the hero, their currencies and the navigation,
 * beside a large main panel that swaps as the player moves around.
 *
 * At M0 the rail's destinations are disabled and the main panel says plainly what
 * is and is not built yet. Each milestone turns one of these on for real — nothing
 * here pretends to work (Brief §2.1).
 */
import { CurrencyBar, EmptyState, Panel, Portrait, SideNav, StatBar, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
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

export function createHubScreen(store: AppStore): Screen {
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const portrait = track(
    new Portrait({ art: 'silhouette-warrior-m', shape: 'square', size: 96, fit: 'contain' }),
  );
  const xp = track(new StatBar({ kind: 'xp', value: 0, max: 100, readout: 'none', width: '100%' }));
  const currencies = track(
    new CurrencyBar({
      currencies: [{ id: 'gold', icon: 'icon-coins', amount: 0, label: 'Gold' }],
      format: 'short',
    }),
  );
  const nav = track(new SideNav({ items: NAV_ITEMS, variant: 'full', fill: true }));

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
      title: t('app.title'),
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
    ),
    h('main', { class: 'omf-shell__main' }, main.el),
  );

  // The save slice can change after boot (a later write reports a new status),
  // so the line follows the store rather than being a one-shot render.
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
    case 'corrupt':
      return t('save.status.corrupt');
    case 'loaded':
      return t('save.status.loaded');
  }
}

/**
 * The hub shell — the frame the whole game lives inside.
 *
 * Layout follows the reference screenshots (Brief §20.3, UI_FANTASYUI_MAP §1):
 * a persistent left rail carrying the hero, their currencies and the navigation,
 * beside a large main panel that swaps as the player moves around.
 *
 * The rail is built once and reused by every destination, so moving between the
 * tower and the screens that follow it never rebuilds the hero's own frame —
 * only the panel beside it. Destinations stay disabled until the milestone that
 * builds each one, and a disabled entry says what it is rather than vanishing
 * (Brief §20.5).
 */
import { Button, CurrencyBar, Portrait, SideNav, StatBar, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { xpToNextLevel } from '@/domain/progression/xp.ts';
import type { AppStore } from '@/app/state.ts';
import { clock } from '@/app/time.ts';
import { computeBadges, type Badges } from '@/ui/badges.ts';
import { t } from '@/strings/index.ts';

export type ShellSection = 'tower' | 'character' | 'merchants' | 'gacha' | 'quests' | 'upgrades';

/** Rail order, which is also the order the component renders them in. */
const NAV_ORDER: readonly ShellSection[] = [
  'tower',
  'character',
  'merchants',
  'gacha',
  'quests',
  'upgrades',
];

export interface ShellOptions {
  store: AppStore;
  /** Which rail entry is lit. */
  active: ShellSection;
  /** Content for the main panel area. */
  main: HTMLElement;
  /** Leave this character and go back to the select screen (Q2). */
  onSwitch: () => void;
  /** Move to another destination. */
  onNavigate: (section: ShellSection) => void;
}

export interface Shell {
  el: HTMLElement;
  destroy(): void;
}

export function createShell(options: ShellOptions): Shell {
  const { store, active, main, onSwitch, onNavigate } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const character = store.get().activeCharacter;
  const definition = character ? CLASSES[character.identity.classId] : null;
  // One service decides every dot in the game (§20.5); the rail only renders it.
  const badges: Badges = character
    ? computeBadges(character, clock().now(), store.get().account)
    : {
        tower: false,
        character: false,
        merchants: false,
        gacha: false,
        quests: false,
        upgrades: false,
      };

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

  const nav = track(
    new SideNav({
      items: [
        { id: 'tower', label: t('nav.section.tower'), glyph: 'glyph-crossed-swords' },
        {
          id: 'character',
          label: t('nav.section.character'),
          glyph: 'glyph-cloaked-figure',
          ...(badges.character ? { dot: true } : {}),
        },
        {
          id: 'merchants',
          label: t('nav.section.merchants'),
          glyph: 'glyph-burning-scroll',
          ...(badges.merchants ? { dot: true } : {}),
        },
        {
          id: 'gacha',
          label: t('nav.section.gacha'),
          glyph: 'glyph-shooting-stars',
          ...(badges.gacha ? { dot: true } : {}),
        },
        {
          id: 'quests',
          label: t('nav.section.quests'),
          glyph: 'glyph-arcane-symbol',
          ...(badges.quests ? { dot: true } : {}),
        },
        {
          id: 'upgrades',
          label: t('nav.section.upgrades'),
          glyph: 'glyph-holy-totem',
          footer: true,
          ...(badges.upgrades ? { dot: true } : {}),
        },
      ],
      value: active,
      variant: 'full',
      fill: true,
    }),
  );

  // `SideNav` emits the id itself, not an object wrapping it.
  nav.on<string>('nav:change', (id) => {
    if (id !== active) onNavigate(id as ShellSection);
  });

  // Stable hooks for the tutorial's anchors and for tests. The component renders
  // its items in the order they were given (footer entries last), so tagging by
  // position is exact — and far steadier than an nth-of-type selector that any
  // future nav entry would silently shift.
  const buttons = nav.el.querySelectorAll<HTMLElement>('.fui-sidenav__item');
  NAV_ORDER.forEach((id, index) => {
    const button = buttons[index];
    if (button) button.dataset.navId = id;
  });

  const switchButton = track(new Button({ label: t('select.switch'), variant: 'ghost' }));
  switchButton.on('click', () => onSwitch());

  const saveStatus = h('p', {
    class: 'omf-save-status',
    dataset: { testid: 'save-status' },
    text: saveStatusText(store),
  });

  const el = h(
    'div',
    { class: 'omf-shell', dataset: { fuiTheme: 'stone-vine', testid: 'hub' } },
    h(
      'aside',
      { class: 'omf-shell__rail' },
      h(
        'div',
        { class: 'omf-shell__hero' },
        portrait.el,
        h('p', {
          class: 'omf-shell__name fui-title',
          dataset: { testid: 'hero-name' },
          text: character?.identity.name ?? '',
        }),
        h('p', {
          class: 'omf-shell__class',
          text: definition ? t(definition.nameKey) : '',
        }),
        xp.el,
      ),
      currencies.el,
      nav.el,
      switchButton.el,
      saveStatus,
    ),
    h('main', { class: 'omf-shell__main' }, main),
  );

  // The hero's own frame tracks the character it belongs to: a floor cleared
  // mid-session moves the XP bar and the gold count without a screen change.
  const unsubscribeSave = store.select(
    (state) => state.save,
    () => {
      saveStatus.textContent = saveStatusText(store);
    },
  );

  const unsubscribeCharacter = store.select(
    (state) => state.activeCharacter,
    (current) => {
      if (!current) return;
      // `Portrait` has no setter for its level badge (an upstream wish recorded in
      // UI_FANTASYUI_MAP §10), so the badge refreshes when the router next builds
      // a screen — which is the same beat a level-up returns the player on.
      xp.setMax(xpToNextLevel(current.progression.level, current.progression.ascension));
      xp.set(current.progression.xp);
      currencies.set('gold', current.currencies.gold);
    },
  );

  return {
    el,
    destroy() {
      unsubscribeSave();
      unsubscribeCharacter();
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

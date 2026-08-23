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
 *
 * **What the rail is for.** It carried a portrait, an unlabelled bar, one gold
 * number, the nav, and half a screen of nothing between the last destination and
 * the bottom. The rail is the only thing on screen at all times, so it is the
 * right place for the handful of numbers a player checks between every action —
 * and the wrong place for anything they would only look up once. What earns its
 * space here:
 *
 *  - **Level and XP as numbers**, not a coloured bar with nothing on it. A bar
 *    that says neither what it measures nor how far along it is is decoration.
 *  - **The wallet, whole.** Gold was the only balance on screen anywhere outside
 *    the summoning lobby, so a player holding two Lucky Tickets had no way to
 *    know it without going and looking. Tickets appear only once held: a zero
 *    counter for something never seen is noise.
 *  - **The climb.** This is a tower climber, and neither number that describes
 *    the climb was visible unless the tower screen happened to be open — the run
 *    that a death resets, and the record a death never touches (§3.4).
 *  - **Power Level**, because it silently decides the quality of every item the
 *    game offers (§13), and it was buried on the character sheet.
 *  - **Draughts still running**, because they expire in real time whether the
 *    player is looking at them or not (§12).
 */
import {
  Button,
  CurrencyBar,
  Portrait,
  SideNav,
  StarRating,
  StatBar,
  StatChip,
  commas,
  h,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { potionFor } from '@/content/items/potions.ts';
import { INVENTORY_CAPACITY } from '@/content/balance/merchants.ts';
import { MAX_ASCENSION } from '@/content/balance/progression.ts';
import { equippedItems, totalStatsOf } from '@/domain/character/character.ts';
import { activePotions, remainingMs } from '@/domain/potions/potions.ts';
import { powerLevel } from '@/domain/power/power.ts';
import { xpToNextLevel } from '@/domain/progression/xp.ts';
import type { Character } from '@/domain/character/types.ts';
import type { AppStore } from '@/app/state.ts';
import type { Screen } from '@/app/router.ts';
import { clock } from '@/app/time.ts';
import { computeBadges, type Badges } from '@/ui/badges.ts';
import { shortDuration } from '@/ui/format.ts';
import { currencyTooltip, type CurrencyId } from '@/ui/wallet.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

/**
 * The rail's destinations.
 *
 * The two merchants are two entries rather than one with tabs inside it. They
 * sell different things out of different stock with their own restock clocks, a
 * player goes to one or the other with a purpose already in mind, and a tab
 * strip inside a screen hides half of that behind a click the rail could have
 * saved (§20.5, §11).
 */
export type ShellSection =
  'tower' | 'character' | 'equipmentMerchant' | 'magicMerchant' | 'gacha' | 'quests' | 'upgrades';

/** Rail order, which is also the order the component renders them in. */
const NAV_ORDER: readonly ShellSection[] = [
  'tower',
  'character',
  'equipmentMerchant',
  'magicMerchant',
  'gacha',
  'quests',
  'upgrades',
];

/**
 * How often the running-draught timers are rewritten.
 *
 * Potions run in wall-clock time, so a rail built when the player entered a
 * screen goes stale while they read it. Fifteen seconds is well inside the
 * minute the readout is rounded to, and the tick only rewrites text — no layout,
 * no component rebuild. It is cleared in `destroy()`; a timer that outlives its
 * screen is a defect (ARCHITECTURE §4).
 */
const POTION_TICK_MS = 15_000;

export interface ShellOptions {
  store: AppStore;
  /** Which rail entry is lit. */
  active: ShellSection;
  /**
   * The screen filling the main panel. The shell **owns** it: `destroy()` tears
   * it down along with the shell's own parts.
   *
   * This takes the screen rather than its element on purpose. Passing
   * `createTowerScreen({...}).el` reads harmlessly and leaks: the screen object
   * is dropped on the floor, so nothing ever calls its `destroy()`, and every
   * component inside it keeps whatever observer or listener it registered —
   * which keeps the detached tree alive. M10 measured it at ~41 listeners and
   * ~91 retained nodes per screen visit, growing without bound (Q: why do
   * fights not leak? The combat route returns its screen, so the router
   * destroys it).
   */
  main: Screen;
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
        equipmentMerchant: false,
        magicMerchant: false,
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

  const xpMax = character
    ? xpToNextLevel(character.progression.level, character.progression.ascension)
    : 100;

  const xp = track(
    new StatBar({
      kind: 'xp',
      value: character?.progression.xp ?? 0,
      max: xpMax,
      readout: 'none',
      width: '100%',
    }),
  );

  /**
   * The level and the XP count, above the bar rather than inside it.
   *
   * `StatBar` can print its own ratio, but at rail width a level label and
   * "12,430 / 18,900" together end up set at a size nobody reads. Two elements
   * with the room to be legible beat one crowded overlay.
   */
  const levelLabel = h('span', {
    class: 'omf-rail__xp-level fui-title',
    text: t('rail.level', { level: character?.progression.level ?? 1 }),
  });
  const xpCount = h('span', {
    class: 'omf-rail__xp-count fui-num',
    text: t('rail.xp', { xp: commas(character?.progression.xp ?? 0), next: commas(xpMax) }),
  });
  const xpBlock = h(
    'div',
    { class: 'omf-rail__xp', dataset: { testid: 'rail-xp' } },
    h('div', { class: 'omf-rail__xp-head' }, levelLabel, xpCount),
    xp.el,
  );

  const xpTip = (value: number, max: number, level: number): string =>
    t('rail.xpTip', { remaining: commas(Math.max(0, max - value)), next: level + 1 });
  setTip(xpBlock, xpTip(character?.progression.xp ?? 0, xpMax, character?.progression.level ?? 1));

  /**
   * The two numbers that decide what the game hands the player next.
   *
   * Power Level silently sets the bracket every drop, shelf and rite draws from
   * (§13) and lived on the character sheet; the backpack is finite (Q16) and a
   * full one changes what happens to a drop, which is a state worth seeing
   * before the fight rather than after it.
   */
  const powerChip = track(
    new StatChip({ label: t('rail.power'), value: 0, size: 'sm', tone: 'gold', compact: true }),
  );
  setTip(powerChip.el, t('rail.powerTip'));

  const bagChip = track(new StatChip({ label: t('rail.bag'), value: '', size: 'sm' }));

  const chips = h('div', { class: 'omf-rail__chips' }, powerChip.el, bagChip.el);

  /**
   * Ascension, only once there is any.
   *
   * Five empty stars under every freshly made hero say "you are missing
   * something" about a system they cannot reach until level 100 (§7). One star
   * appearing the day they ascend says the opposite, and says it louder.
   */
  const ascension = character?.progression.ascension ?? 0;
  const stars =
    ascension > 0
      ? track(new StarRating({ value: ascension, max: MAX_ASCENSION, size: 13, showValue: false }))
      : null;
  if (stars) setTip(stars.el, t('rail.ascension', { tier: ascension, max: MAX_ASCENSION }));

  /**
   * The wallet, whole.
   *
   * Gold is the only *money* in the game (Q1); tickets are what the rites take
   * (§16.1), and until now they were visible on exactly one screen. Each one is
   * shown only once the hero holds some — a nought beside a currency a new
   * player has never heard of explains nothing and costs a line.
   */
  const currencies = track(
    new CurrencyBar({
      currencies: [
        { id: 'gold', icon: 'icon-coins', amount: character?.currencies.gold ?? 0, label: 'Gold' },
        ...(character && character.currencies.tickets > 0
          ? [
              {
                id: 'tickets',
                icon: 'icon-scroll',
                amount: character.currencies.tickets,
                label: t('currency.tickets'),
              },
            ]
          : []),
        ...(character && character.currencies.luckyTickets > 0
          ? [
              {
                id: 'luckyTickets',
                icon: 'icon-star',
                amount: character.currencies.luckyTickets,
                label: t('currency.luckyTickets'),
              },
            ]
          : []),
      ],
      format: 'short',
    }),
  );

  // `CurrencyBar` labels each balance with a native `title` — which the tooltip
  // service would adopt and serve as the name alone. What the player wants to
  // know is what the balance is *for*, and where more of it comes from; that
  // card is built once in `wallet.ts` and served by every surface that shows a
  // balance, so the rail and the shop counter never disagree.
  const shown: CurrencyId[] = [
    'gold',
    ...((character?.currencies.tickets ?? 0) > 0 ? (['tickets'] as const) : []),
    ...((character?.currencies.luckyTickets ?? 0) > 0 ? (['luckyTickets'] as const) : []),
  ];
  currencies.el.querySelectorAll<HTMLElement>('.fui-currency__item').forEach((item, index) => {
    const id = shown[index];
    if (id) setTip(item, currencyTooltip(id, character?.currencies[id] ?? 0));
  });

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
          id: 'equipmentMerchant',
          label: t('nav.section.equipmentMerchant'),
          glyph: 'glyph-burning-scroll',
          ...(badges.equipmentMerchant ? { dot: true } : {}),
        },
        {
          id: 'magicMerchant',
          label: t('nav.section.magicMerchant'),
          glyph: 'glyph-health-potion',
          ...(badges.magicMerchant ? { dot: true } : {}),
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

  /**
   * The portrait is the shortest route to the character sheet, and players reach
   * for it before they reach for the rail. It is a real `button` rather than a
   * clickable `div` so it is tab-reachable and answers the keyboard, and it is
   * inert on the sheet itself — a control that navigates to where you already
   * are is a dead end (§2.1).
   */
  const heroLink = h('button', {
    class: 'omf-shell__portrait',
    attrs: { type: 'button' },
    dataset: { testid: 'hero-portrait' },
  });
  heroLink.appendChild(portrait.el);
  const heroTip = active === 'character' ? t('nav.hero.here') : t('nav.hero.toCharacter');
  if (active === 'character') heroLink.disabled = true;
  else heroLink.addEventListener('click', () => onNavigate('character'));

  // `Portrait` sets its own `title` with the hero's name, which the tooltip
  // service would adopt onto the inner element and serve in place of this one —
  // and the name is already printed directly underneath. Claiming the attribute
  // first is what keeps the control's own explanation on top.
  setTip(heroLink, heroTip);
  setTip(portrait.el, heroTip);

  // --- the climb ------------------------------------------------------------

  const runValue = h('span', { class: 'omf-rail__stat-value fui-num' });
  const bestValue = h('span', { class: 'omf-rail__stat-value fui-num' });

  const statRow = (label: string, value: HTMLElement, tip: string): HTMLElement => {
    const row = h(
      'div',
      { class: 'omf-rail__stat' },
      h('span', { class: 'omf-rail__stat-label', text: label }),
      value,
    );
    setTip(row, tip);
    return row;
  };

  const potionRow = h('div', { class: 'omf-rail__potions' });

  const climb = h(
    'section',
    { class: 'omf-rail__plate omf-rail__climb', dataset: { testid: 'rail-climb' } },
    h('h2', { class: 'omf-rail__plate-title fui-label', text: t('rail.climb') }),
    statRow(t('rail.thisRun'), runValue, t('rail.thisRunTip')),
    statRow(t('rail.bestEver'), bestValue, t('rail.bestEverTip')),
    potionRow,
  );

  /** Every number in the climb plate, from one character. */
  const paintClimb = (current: Character | null, now: number): void => {
    if (!current) return;
    powerChip.set(
      powerLevel({
        equipped: equippedItems(current),
        stats: totalStatsOf(current),
        ascension: current.progression.ascension,
        highestFloorEverCleared: current.tower.highestFloorEverCleared,
      }),
    );

    const used = current.inventory.length;
    const full = used >= INVENTORY_CAPACITY;
    bagChip.set(`${used} / ${INVENTORY_CAPACITY}`);
    bagChip.el.dataset.tone = full ? 'bad' : 'neutral';
    setTip(
      bagChip.el,
      full
        ? t('rail.bagFullTip')
        : t('rail.bagTip', {
            used,
            capacity: INVENTORY_CAPACITY,
            free: INVENTORY_CAPACITY - used,
          }),
    );

    runValue.textContent = t('rail.floorValue', { floor: current.tower.currentRunFloor });
    bestValue.textContent =
      current.tower.highestFloorEverCleared > 0
        ? t('rail.floorValue', { floor: current.tower.highestFloorEverCleared })
        : t('rail.noClimb');

    // Draughts, only while any is running. An empty row every other minute is
    // worse than no row: it teaches the player to stop looking there.
    const running = activePotions(current.potions, now);
    potionRow.replaceChildren();
    potionRow.hidden = running.length === 0;
    if (running.length === 0) return;

    potionRow.appendChild(h('span', { class: 'omf-rail__stat-label', text: t('rail.running') }));
    for (const potion of running) {
      const def = potionFor(potion.stat, potion.tier);
      const chip = h(
        'span',
        { class: 'omf-rail__potion' },
        h('span', {
          class: 'omf-rail__potion-icon',
          style: { backgroundImage: `var(--fui-img-${def.icon})` },
        }),
        h('span', { class: 'fui-num', text: shortDuration(remainingMs(potion, now)) }),
      );
      setTip(
        chip,
        t('potion.active', {
          time: shortDuration(remainingMs(potion, now)),
          effect: t('potion.effect', {
            stat: t(`stat.${potion.stat}`),
            percent: Math.round(potion.magnitude * 100),
          }),
        }),
      );
      potionRow.appendChild(chip);
    }
  };

  paintClimb(character, clock().now());

  const el = h(
    'div',
    { class: 'omf-shell', dataset: { fuiTheme: 'stone-vine', testid: 'hub' } },
    h(
      'aside',
      { class: 'omf-shell__rail' },
      h(
        'div',
        { class: 'omf-shell__hero omf-rail__plate' },
        heroLink,
        h('p', {
          class: 'omf-shell__name fui-title',
          dataset: { testid: 'hero-name' },
          text: character?.identity.name ?? '',
        }),
        h(
          'p',
          { class: 'omf-shell__class' },
          h('span', { text: definition ? t(definition.nameKey) : '' }),
          ...(stars ? [stars.el] : []),
        ),
        xpBlock,
        chips,
      ),
      currencies.el,
      climb,
      nav.el,
      switchButton.el,
      saveStatus,
    ),
    h('main', { class: 'omf-shell__main' }, main.el),
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
      const max = xpToNextLevel(current.progression.level, current.progression.ascension);
      xp.setMax(max);
      xp.set(current.progression.xp);
      levelLabel.textContent = t('rail.level', { level: current.progression.level });
      xpCount.textContent = t('rail.xp', {
        xp: commas(current.progression.xp),
        next: commas(max),
      });
      setTip(xpBlock, xpTip(current.progression.xp, max, current.progression.level));
      currencies.set('gold', current.currencies.gold);
      paintClimb(current, clock().now());
    },
  );

  const potionTimer = setInterval(() => {
    paintClimb(store.get().activeCharacter, clock().now());
  }, POTION_TICK_MS);

  return {
    el,
    destroy() {
      clearInterval(potionTimer);
      unsubscribeSave();
      unsubscribeCharacter();
      main.destroy();
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

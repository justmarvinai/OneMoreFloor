/**
 * The character screen (Brief §6, §7, §9, §10; UI_FANTASYUI_MAP §4).
 *
 * The layout follows `character_screen.png` (§20.3), and follows it literally:
 * **one framed window** holding the whole hero — gear sockets down both sides of
 * the portrait, the weapons under it, who the hero is beneath that, then the
 * stat rows with the button that raises each one, and the running potions last.
 * The backpack is the second window, down the right-hand side.
 *
 * The first pass had these as four floating blocks, two of them unframed, with
 * the gear score marooned in the middle of the screen. That reads as a web page
 * with panels on it; the reference reads as a character sheet, and the
 * difference is almost entirely that the sheet is *one* bordered thing.
 *
 * Every number on this screen says what it *does*, not just what it is. A stat
 * row that reads "Defense 412" tells a player nothing they can act on; one that
 * adds "31% of damage turned away" tells them whether the next point is worth
 * buying (§6).
 */
import {
  Button,
  CostButton,
  InventoryGrid,
  Panel,
  Paperdoll,
  PowerRating,
  StarRating,
  StatBar,
  h,
  type EquipSlotDef,
  type SlotItem,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { INVENTORY_CAPACITY } from '@/content/balance/merchants.ts';
import { potionFor } from '@/content/items/potions.ts';
import { statReadouts } from '@/domain/combat/readouts.ts';
import {
  canAscend,
  combatStatsOf,
  equippedItems,
  levelCapFor,
  totalStatsOf,
} from '@/domain/character/character.ts';
import { EQUIP_SLOT_IDS, type Character, type EquipSlotId } from '@/domain/character/types.ts';
import { availableSlots } from '@/domain/items/equip.ts';
import { statUpgradeCost } from '@/domain/economy/statUpgrades.ts';
import { powerLevel } from '@/domain/power/power.ts';
import { activePotions, remainingMs } from '@/domain/potions/potions.ts';
import { xpToNextLevel } from '@/domain/progression/xp.ts';
import { MAX_ASCENSION } from '@/content/balance/progression.ts';
import { UPGRADABLE_STAT_IDS, type UpgradableStatId } from '@/domain/stats.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { itemSlot, itemTooltip } from '@/ui/itemView.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

/**
 * Where each slot sits on the paperdoll: armour down one side, the cape and the
 * ascension trinkets down the other, weapons in the row beneath — the
 * arrangement the reference screen uses.
 *
 * Six and six rather than seven and five: the columns set the doll's height, and
 * an uneven pair both wastes a row of it and leaves one side visibly short.
 */
const SLOT_LAYOUT: Readonly<Record<EquipSlotId, 'left' | 'right' | 'bottom'>> = {
  helmet: 'left',
  chest: 'left',
  gauntlets: 'left',
  wrists: 'left',
  leggings: 'left',
  boots: 'left',
  cape: 'right',
  ring: 'right',
  necklace: 'right',
  amulet: 'right',
  relic: 'right',
  artifact: 'right',
  mainhand: 'bottom',
  offhand: 'bottom',
};

export interface CharacterScreenOptions {
  character: Character;
  /** Wall-clock time, for potion timers (Q9). */
  now: number;
  onSelectItem: (uid: string) => void;
  onBuyStat: (stat: UpgradableStatId) => void;
  onAscend: () => void;
}

export interface CharacterScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createCharacterScreen(options: CharacterScreenOptions): CharacterScreen {
  const { character, now, onSelectItem, onBuyStat, onAscend } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const definition = CLASSES[character.identity.classId];
  const durable = totalStatsOf(character);
  const withPotions = combatStatsOf(character, now);
  const unlocked = new Set<EquipSlotId>(availableSlots(character.progression.ascension));
  const floor = Math.max(1, character.tower.currentRunFloor);
  const readouts = statReadouts(withPotions, floor);

  // --- the paperdoll --------------------------------------------------------

  const slots: EquipSlotDef[] = EQUIP_SLOT_IDS.map((slot) => ({
    id: slot,
    label: t(`slot.${slot}` as StringKey),
    column: SLOT_LAYOUT[slot],
  }));

  const equipped: Record<string, SlotItem | null> = {};
  for (const slot of EQUIP_SLOT_IDS) {
    const item = character.equipment[slot];
    equipped[slot] = item ? itemSlot(item) : null;
  }

  const paperdoll = track(
    new Paperdoll({
      portrait: undefined,
      silhouette: definition.art.portrait,
      slots,
      equipped,
      // The sockets belong at the sheet's edges, as they are in the reference.
      // `Paperdoll` writes its width inline, so this is how it is overridden.
      style: { width: '100%' },
      gearScore: Math.round(
        powerLevel({
          equipped: equippedItems(character),
          stats: durable,
          ascension: character.progression.ascension,
          highestFloorEverCleared: character.tower.highestFloorEverCleared,
        }),
      ),
    }),
  );
  paperdoll.on<{ slotId: string; item: SlotItem | null }>('equip:click', ({ slotId, item }) => {
    if (typeof item?.data === 'string') onSelectItem(item.data);
    else if (!unlocked.has(slotId as EquipSlotId)) {
      // Nothing to open, but the slot has already said why it is closed.
    }
  });

  /**
   * Every socket says something on hover: the piece in it, why it is shut, or
   * that it is simply empty. A socket that explains nothing is the commonest way
   * a character sheet stops being readable (§20.4/§20.5).
   *
   * `Paperdoll` renders its sockets in the order it was given them, per column,
   * and puts no id on the cells — so this walks the columns in the same order to
   * pair each socket with its element, and stamps the id on while it is there.
   * The M5 pass addressed them with a `[data-slot-id]` selector that matched
   * nothing, which is why locked sockets have been silent since they shipped.
   * Recorded as an upstream wish (UI_FANTASYUI_MAP §10).
   */
  const cells: Record<'left' | 'right' | 'bottom', HTMLElement[]> = {
    left: columnCells(paperdoll.el, '.fui-doll__col--left'),
    right: columnCells(paperdoll.el, '.fui-doll__col--right'),
    bottom: columnCells(paperdoll.el, '.fui-doll__row'),
  };
  const taken: Record<'left' | 'right' | 'bottom', number> = { left: 0, right: 0, bottom: 0 };

  for (const slot of EQUIP_SLOT_IDS) {
    const column = SLOT_LAYOUT[slot];
    const cell = cells[column][taken[column]];
    taken[column] += 1;
    if (!cell) continue;
    cell.dataset.slotId = slot;

    if (!unlocked.has(slot)) {
      setTip(cell, t('character.lockedSlot', { tier: tierUnlocking(slot) }));
      continue;
    }

    const worn = character.equipment[slot];
    setTip(
      cell,
      worn
        ? itemTooltip(worn, { worn: true, showSellValue: true, hint: t('item.wornHint') })
        : `${t(`slot.${slot}` as StringKey)} — ${t('item.emptySlotHint')}`,
    );
  }

  // --- who the hero is ------------------------------------------------------

  const power = track(
    new PowerRating({
      value: Math.round(
        powerLevel({
          equipped: equippedItems(character),
          stats: durable,
          ascension: character.progression.ascension,
          highestFloorEverCleared: character.tower.highestFloorEverCleared,
        }),
      ),
      label: t('character.power'),
      size: 'md',
      compact: true,
    }),
  );

  const stars = track(
    new StarRating({
      value: character.progression.ascension,
      max: MAX_ASCENSION,
      size: 20,
      showValue: true,
    }),
  );

  const cap = levelCapFor(character.progression.ascension);
  const levelLine = h('p', {
    class: 'omf-character__level',
    text: Number.isFinite(cap)
      ? t('character.levelCap', { level: character.progression.level, cap })
      : t('character.levelCapEndless', { level: character.progression.level }),
  });

  const xp = track(
    new StatBar({
      kind: 'xp',
      value: character.progression.xp,
      max: xpToNextLevel(character.progression.level, character.progression.ascension),
      readout: 'ratio',
      width: '100%',
    }),
  );

  const ascendable = canAscend(character);
  const ascendButton = track(
    new Button({
      label: t('character.ascend'),
      variant: 'primary',
      disabled: !ascendable,
    }),
  );
  ascendButton.on('click', () => {
    if (ascendable) onAscend();
  });
  setTip(
    ascendButton.el,
    character.progression.ascension >= MAX_ASCENSION
      ? t('character.ascendMax')
      : ascendable
        ? t('character.ascendReady')
        : t('character.ascendLocked', { level: cap }),
  );

  /**
   * Who the hero is, in one strip under the portrait — name, power, ascension,
   * level and the bar toward the next one, with Ascend at the end of it.
   *
   * This used to be its own arched window in the right-hand column, where it had
   * a habit of being squeezed until the XP bar sat on the frame's bottom
   * ornament and the Ascend button was pushed out of the panel entirely. It is
   * one strip inside the sheet now, which is both what the reference does and
   * one fewer box to keep from collapsing.
   */
  const heroStrip = h(
    'div',
    { class: 'omf-character__hero' },
    h('div', { class: 'omf-character__identity' }, power.el, stars.el),
    h('div', { class: 'omf-character__progress' }, levelLine, xp.el),
    ascendButton.el,
  );

  // --- stats and what they buy ---------------------------------------------

  const statRows = UPGRADABLE_STAT_IDS.map((stat) => {
    const cost = statUpgradeCost(stat, character.purchasedStats[stat]);
    const buy = track(
      new CostButton({
        label: t('character.buy'),
        cost,
        currencyGlyph: 'icon-coins',
        currency: t('currency.gold'),
        balance: character.currencies.gold,
        size: 'sm',
      }),
    );
    buy.on('cost:buy', () => onBuyStat(stat));

    return h(
      'div',
      { class: 'omf-character__stat', dataset: { stat } },
      h(
        'div',
        { class: 'omf-character__stat-text' },
        h('span', { class: 'omf-character__stat-name', text: t(`stat.${stat}` as StringKey) }),
        h('span', { class: 'omf-character__stat-hint', text: hintFor(stat, readouts) }),
      ),
      h('span', { class: 'omf-character__stat-value fui-num', text: String(withPotions[stat]) }),
      buy.el,
    );
  });

  // Speed sits with the others so its absence is visible and explained, rather
  // than the player wondering why one of the six stats is missing (§6).
  const speedRow = h(
    'div',
    { class: 'omf-character__stat is-locked', dataset: { stat: 'speed' } },
    h(
      'div',
      { class: 'omf-character__stat-text' },
      h('span', { class: 'omf-character__stat-name', text: t('stat.speed') }),
      h('span', { class: 'omf-character__stat-hint', text: hintFor('speed', readouts) }),
    ),
    h('span', { class: 'omf-character__stat-value fui-num', text: String(withPotions.speed) }),
    h('span', { class: 'omf-character__stat-locked', text: t('character.buyLocked') }),
  );

  const statsBlock = h(
    'section',
    { class: 'omf-character__statblock' },
    h('h3', { class: 'omf-character__section fui-title', text: t('character.stats') }),
    h('div', { class: 'omf-character__stats' }, ...statRows, speedRow),
    potionRow(),
  );

  function potionRow(): HTMLElement {
    const running = activePotions(character.potions, now);
    if (running.length === 0) {
      return h('p', { class: 'omf-character__potions-empty', text: t('potion.none') });
    }

    const chips = running.map((potion) => {
      const def = potionFor(potion.stat, potion.tier);
      const chip = h(
        'div',
        { class: 'omf-character__potion' },
        h('span', {
          class: 'omf-character__potion-icon',
          style: { backgroundImage: `var(--fui-img-${def.icon})` },
        }),
        h('span', { class: 'fui-num', text: shortDuration(remainingMs(potion, now)) }),
      );
      setTip(
        chip,
        t('potion.active', {
          time: shortDuration(remainingMs(potion, now)),
        }) +
          ' — ' +
          t('potion.effect', {
            percent: Math.round(potion.magnitude * 100),
            stat: t(`stat.${potion.stat}` as StringKey),
          }),
      );
      return chip;
    });

    return h('div', { class: 'omf-character__potions' }, ...chips);
  }

  // --- the backpack ---------------------------------------------------------

  const backpack = track(
    new InventoryGrid({
      cols: 5,
      size: INVENTORY_CAPACITY,
      items: character.inventory.map((item) => itemSlot(item)),
      slotSize: 'md',
      draggable: false,
      placeholder: 'slot-stone-md',
    }),
  );
  backpack.on<{ item: SlotItem | null }>('inventory:click', ({ item }) => {
    if (typeof item?.data === 'string') onSelectItem(item.data);
  });

  /**
   * Hovering a piece explains it — the game's only tooltip (§20.4), and the whole
   * card: what it is, what it gives, what it is worth, and **what changes if you
   * wear it** in place of the piece already in that slot. The first pass passed
   * only `tip.title` to the tooltip, so a backpack full of gear said nothing but
   * its own name.
   */
  for (const [index, item] of character.inventory.entries()) {
    const cell = backpack.el.children[index];
    if (!(cell instanceof HTMLElement)) continue;
    const slot = requireItemDef(item.defId).slot;
    setTip(
      cell,
      itemTooltip(item, {
        showSellValue: true,
        compareTo: character.equipment[slot] ?? null,
        hint: t('item.inspect'),
      }),
    );
  }

  const backpackPanel = track(
    new Panel({
      title: t('character.backpack', {
        used: character.inventory.length,
        capacity: INVENTORY_CAPACITY,
      }),
      variant: 'default',
      width: '100%',
      height: '100%',
      scroll: true,
      content:
        character.inventory.length === 0
          ? [h('p', { class: 'omf-character__empty', text: t('inventory.empty') }), backpack.el]
          : [backpack.el],
    }),
  );

  /**
   * The sheet: one framed window, everything about the hero inside it. Scrolls
   * as a whole rather than letting any one block be squeezed — the failure that
   * put the XP bar through the bottom of its own frame.
   */
  const sheet = track(
    new Panel({
      title: character.identity.name,
      subtitle: t('character.subtitle', {
        level: character.progression.level,
        className: t(definition.nameKey),
      }),
      variant: 'default',
      width: '100%',
      height: '100%',
      scroll: true,
      content: [
        h(
          'section',
          { class: 'omf-character__gear' },
          h('h3', {
            class: 'omf-character__section fui-title',
            text: t('character.equipment'),
          }),
          h('div', { class: 'omf-character__doll' }, paperdoll.el),
          heroStrip,
        ),
        statsBlock,
      ],
    }),
  );

  const el = h(
    'div',
    { class: 'omf-character', dataset: { fuiTheme: 'stone-vine', testid: 'character' } },
    h('div', { class: 'omf-character__sheet' }, sheet.el),
    h('div', { class: 'omf-character__side' }, backpackPanel.el),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** The socket cells of one paperdoll column, in the order they were rendered. */
function columnCells(root: HTMLElement, selector: string): HTMLElement[] {
  const column = root.querySelector(selector);
  if (!column) return [];
  return [...column.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
}

/** The ascension tier that opens a slot, for the locked-slot explanation (§7). */
function tierUnlocking(slot: EquipSlotId): number {
  const order: EquipSlotId[] = ['ring', 'necklace', 'amulet', 'relic', 'artifact'];
  const index = order.indexOf(slot);
  return index < 0 ? 0 : index + 1;
}

function hintFor(
  stat: UpgradableStatId | 'speed',
  readouts: ReturnType<typeof statReadouts>,
): string {
  switch (stat) {
    case 'strength':
      return t('stat.hint.strength', { value: readouts.damagePerStrike });
    case 'defense':
      return t('stat.hint.defense', { percent: Math.round(readouts.mitigation * 100) });
    case 'hp':
      return t('stat.hint.hp');
    case 'resource':
      return t('stat.hint.resource', { value: readouts.resourcePool });
    case 'luck':
      return t('stat.hint.luck', { percent: Math.round(readouts.critChance * 100) });
    case 'speed':
      return t('stat.hint.speed', { percent: Math.round(readouts.doubleAttackChance * 100) });
  }
}

/** "2h 14m" — the shape a potion timer wants, not a stopwatch. */
function shortDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

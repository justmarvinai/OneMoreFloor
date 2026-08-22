/**
 * The character screen (Brief §6, §7, §9, §10; UI_FANTASYUI_MAP §4).
 *
 * The layout follows `character_screen.png` (§20.3): the paperdoll in the
 * middle with the hero's portrait among their gear, the stat rows beneath it
 * each with the gold button that raises them, the running potions under those,
 * and the backpack down the right-hand side.
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
  OrnateHeader,
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
import { itemSlot, itemTooltip } from '@/ui/itemView.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

/**
 * Where each slot sits on the paperdoll: armour down one side, the ascension
 * trinkets down the other, weapons in the row beneath — the arrangement the
 * reference screen uses, and the one that keeps both columns the same length.
 */
const SLOT_LAYOUT: Readonly<Record<EquipSlotId, 'left' | 'right' | 'bottom'>> = {
  helmet: 'left',
  chest: 'left',
  gauntlets: 'left',
  wrists: 'left',
  leggings: 'left',
  boots: 'left',
  cape: 'left',
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
      width: 720,
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

  // A locked slot says what would unlock it rather than going quiet (§20.5).
  for (const slot of EQUIP_SLOT_IDS) {
    if (unlocked.has(slot)) continue;
    const cell = paperdoll.el.querySelector<HTMLElement>(`[data-slot-id="${slot}"]`);
    if (cell) setTip(cell, t('character.lockedSlot', { tier: tierUnlocking(slot) }));
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

  const identity = track(
    new Panel({
      title: t('character.title', { name: character.identity.name }),
      subtitle: t('character.subtitle', {
        level: character.progression.level,
        className: t(definition.nameKey),
      }),
      variant: 'alt',
      width: '100%',
      content: [
        h('div', { class: 'omf-character__identity' }, power.el, stars.el),
        levelLine,
        xp.el,
        ascendButton.el,
      ],
    }),
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

  const statsPanel = track(
    new Panel({
      title: t('character.stats'),
      variant: 'surface',
      width: '100%',
      content: [h('div', { class: 'omf-character__stats' }, ...statRows, speedRow), potionRow()],
    }),
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

  // Hovering a piece explains it — the game's only tooltip (§20.4).
  for (const [index, item] of character.inventory.entries()) {
    const cell = backpack.el.children[index];
    if (cell instanceof HTMLElement) {
      const tip = itemTooltip(item, { showSellValue: true });
      setTip(cell, `${tip.title ?? ''}`);
    }
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

  const el = h(
    'div',
    { class: 'omf-character', dataset: { fuiTheme: 'stone-vine', testid: 'character' } },
    h(
      'div',
      { class: 'omf-character__main' },
      track(new OrnateHeader({ title: t('character.equipment'), size: 'sm' })).el,
      paperdoll.el,
      statsPanel.el,
    ),
    h('div', { class: 'omf-character__side' }, identity.el, backpackPanel.el),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
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

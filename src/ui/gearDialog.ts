/**
 * The gear detail dialog (Brief §10, UI_FANTASYUI_MAP §4).
 *
 * One piece of equipment, everything you can do to it, and — the part that
 * matters — what each action would *give* you. The two upgrade tracks are
 * separate on purpose (§10): gold buys levels, materials found in the tower buy
 * stars, and showing them as one button would hide which resource is actually
 * short.
 *
 * Every refusal here is a sentence, not a grey button (§20.5).
 */
import {
  Button,
  Modal,
  Tabs,
  UpgradePanel,
  h,
  type UpgradeMaterial,
  type UpgradeStat,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { getMaterial, materialIdForTier } from '@/content/items/materials.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { itemStats } from '@/domain/items/derive.ts';
import {
  canAscendGear,
  canLevelUp,
  gearAscensionCost,
  gearLevelCost,
  sellValue,
} from '@/domain/items/upgrade.ts';
import { GEAR_ASCENSION_MAX, GEAR_LEVEL_MAX, type ItemInstance } from '@/domain/items/types.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import type { Character } from '@/domain/character/types.ts';
import { itemName } from '@/ui/itemView.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface GearDialogActions {
  equip(uid: string): void;
  unequip(uid: string): void;
  sell(uid: string): void;
  upgrade(uid: string): void;
  ascend(uid: string): void;
}

export interface GearDialogOptions {
  character: Character;
  uid: string;
  actions: GearDialogActions;
  onClose?: () => void;
}

export interface GearDialog {
  /** Redraw against a changed character — after an upgrade, say. */
  update(character: Character): void;
  close(): void;
}

export function openGearDialog(options: GearDialogOptions): GearDialog | null {
  const { uid, actions, onClose } = options;
  let character = options.character;

  const located = locate(character, uid);
  if (!located) return null;

  const parts: FuiComponent[] = [];
  const body = h('div', { class: 'omf-gear', dataset: { testid: 'gear-dialog' } });

  const modal = new Modal({
    title: itemName(located.item),
    content: [body],
    width: 620,
    closable: true,
  });

  const teardown = (): void => {
    for (const part of parts) part.destroy();
    parts.length = 0;
    modal.destroy();
  };

  modal.on('modal:close', () => {
    teardown();
    onClose?.();
  });

  function render(): void {
    for (const part of parts) part.destroy();
    parts.length = 0;
    body.replaceChildren();

    const found = locate(character, uid);
    if (!found) {
      teardown();
      onClose?.();
      return;
    }

    const { item, worn } = found;
    const gold = character.currencies.gold;

    body.appendChild(statBlock(item));

    const levelPanel = new UpgradePanel({
      title: t('item.upgrade'),
      icon: iconOf(item),
      from: t('item.levelFull', { level: item.level, max: GEAR_LEVEL_MAX }),
      to: t('item.levelFull', { level: item.level + 1, max: GEAR_LEVEL_MAX }),
      stats: levelDeltas(item),
      cost: gearLevelCost(item),
      costIcon: 'icon-coins',
      balance: gold,
      confirmLabel: canLevelUp(item) ? t('item.upgrade') : t('item.upgradeMax'),
    });
    levelPanel.on('upgrade:confirm', () => {
      if (canLevelUp(item)) actions.upgrade(uid);
    });
    parts.push(levelPanel);

    const requirement = gearAscensionCost(item, materialIdForTier);
    const ascendPanel = new UpgradePanel({
      title: t('item.ascend'),
      icon: iconOf(item),
      from: t('item.ascension', { stars: item.ascension, max: GEAR_ASCENSION_MAX }),
      to: t('item.ascension', { stars: item.ascension + 1, max: GEAR_ASCENSION_MAX }),
      stats: ascensionDeltas(item),
      materials: materialRows(character, requirement?.materials ?? {}),
      cost: requirement?.gold ?? 0,
      costIcon: 'icon-coins',
      balance: gold,
      confirmLabel: canAscendGear(item) ? t('item.ascend') : t('item.ascendMax'),
    });
    ascendPanel.on('upgrade:confirm', () => {
      if (canAscendGear(item) && hasMaterials(character, requirement?.materials ?? {})) {
        actions.ascend(uid);
      }
    });
    parts.push(ascendPanel);

    const tabs = new Tabs({
      items: [
        { id: 'level', label: t('item.upgrade'), icon: 'icon-coins' },
        { id: 'ascend', label: t('item.ascend'), icon: 'icon-star' },
      ],
      stretch: true,
    });
    parts.push(tabs);

    const pane = h('div', { class: 'omf-gear__pane' }, levelPanel.el);
    tabs.on<{ id: string }>('tabs:change', ({ id }) => {
      pane.replaceChildren(id === 'level' ? levelPanel.el : ascendPanel.el);
    });

    body.appendChild(tabs.el);
    body.appendChild(pane);

    const wear = new Button({
      label: worn ? t('item.unequip') : t('item.equip'),
      variant: 'primary',
    });
    wear.on('click', () => (worn ? actions.unequip(uid) : actions.equip(uid)));
    parts.push(wear);

    const row = h('div', { class: 'omf-gear__actions' }, wear.el);

    // Selling something you are wearing would be a misclick with consequences.
    if (!worn) {
      const sell = new Button({
        label: t('item.sellFor', { gold: sellValue(item) }),
        variant: 'ghost',
      });
      sell.on('click', () => actions.sell(uid));
      parts.push(sell);
      row.appendChild(sell.el);
    }

    body.appendChild(row);
  }

  render();
  modal.open();

  return {
    update(next) {
      character = next;
      render();
    },
    close() {
      teardown();
    },
  };
}

function locate(character: Character, uid: string): { item: ItemInstance; worn: boolean } | null {
  for (const item of Object.values(character.equipment)) {
    if (item?.uid === uid) return { item, worn: true };
  }
  const carried = character.inventory.find((item) => item.uid === uid);
  return carried ? { item: carried, worn: false } : null;
}

function iconOf(item: ItemInstance): string {
  return requireItemDef(item.defId).icon;
}

function statBlock(item: ItemInstance): HTMLElement {
  const stats = itemStats(item);
  const rows = STAT_IDS.filter((stat) => stats[stat] > 0).map((stat) =>
    h(
      'div',
      { class: 'omf-gear__stat' },
      h('span', { text: t(`stat.${stat}` as StringKey) }),
      h('span', { class: 'fui-num', text: `+${stats[stat]}` }),
    ),
  );
  return h('div', { class: 'omf-gear__stats' }, ...rows);
}

function levelDeltas(item: ItemInstance): UpgradeStat[] {
  const before = itemStats(item);
  const after = itemStats({ ...item, level: Math.min(GEAR_LEVEL_MAX, item.level + 1) });
  return deltaRows(before, after);
}

function ascensionDeltas(item: ItemInstance): UpgradeStat[] {
  const before = itemStats(item);
  const after = itemStats({
    ...item,
    ascension: Math.min(GEAR_ASCENSION_MAX, item.ascension + 1) as ItemInstance['ascension'],
  });
  return deltaRows(before, after);
}

function deltaRows(before: Record<string, number>, after: Record<string, number>): UpgradeStat[] {
  return STAT_IDS.filter((stat) => before[stat]! > 0 || after[stat]! > 0).map((stat) => ({
    label: t(`stat.${stat}` as StringKey),
    from: before[stat]!,
    to: after[stat]!,
  }));
}

function materialRows(character: Character, needed: Record<string, number>): UpgradeMaterial[] {
  return Object.entries(needed).map(([id, need]) => {
    const material = getMaterial(id);
    return {
      icon: material?.icon ?? 'icon-sack',
      name: material ? t(material.nameKey as StringKey) : id,
      need,
      have: character.materials[id] ?? 0,
    };
  });
}

function hasMaterials(character: Character, needed: Record<string, number>): boolean {
  return Object.entries(needed).every(([id, need]) => (character.materials[id] ?? 0) >= need);
}

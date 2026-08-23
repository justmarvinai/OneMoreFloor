/**
 * The merchants (Brief §11/§12, Q16/Q17; UI_FANTASYUI_MAP §5).
 *
 * Both shops are the same screen with different stock, because they *are* the
 * same shop with different stock — one deals in weapons and armour, the other in
 * trinkets and draughts. Giving them separate implementations would mean fixing
 * every bug twice.
 *
 * The two things a shop must always answer are on screen without a click: what
 * the wait costs (the free restock countdown, Q17) and what impatience costs
 * (the reroll price). A shop that only shows the paid option is a shop that is
 * hiding the free one.
 */
import {
  CostButton,
  CountdownTimer,
  InventoryGrid,
  Panel,
  ShopPanel,
  Tabs,
  h,
  type ItemCardData,
  type ShopCategory,
  type SlotItem,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { INVENTORY_CAPACITY } from '@/content/balance/merchants.ts';
import type { Character } from '@/domain/character/types.ts';
import {
  nextRestockAt,
  potionStock,
  rerollCost,
  stockOf,
  type MerchantId,
} from '@/domain/merchants/merchants.ts';
import { isActive } from '@/domain/potions/potions.ts';
import { bracketForCharacter } from '@/domain/tower/run.ts';
import type { UpgradableStatId } from '@/domain/stats.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { itemCard, itemSlot, itemTooltip, statLine } from '@/ui/itemView.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** Card ids are the shelf index for gear and the stat for a draught. */
const POTION_PREFIX = 'potion:';

export interface MerchantScreenOptions {
  character: Character;
  /** Which shop is open; the other is one tab away. */
  merchantId: MerchantId;
  now: number;
  onSwitchMerchant: (id: MerchantId) => void;
  onBuy: (index: number) => void;
  onDrink: (stat: UpgradableStatId) => void;
  onReroll: () => void;
  onSelectItem: (uid: string) => void;
}

export interface MerchantScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createMerchantScreen(options: MerchantScreenOptions): MerchantScreen {
  const { character, merchantId, now, onSwitchMerchant, onBuy, onDrink, onReroll, onSelectItem } =
    options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const bracket = bracketForCharacter(character);
  const state = character.merchants[merchantId];
  const gold = character.currencies.gold;

  const shelf = stockOf(merchantId, character, state, bracket);
  const categories: ShopCategory[] = [];

  /**
   * A row's detail line, carrying the reason it cannot be bought.
   *
   * `ShopPanel` greys out anything dearer than the purse, correctly and
   * silently. §20.5 wants the refusal to *say why*, and every other price in the
   * game prints its shortfall (`CostButton` does), so the shortfall goes on the
   * card rather than leaving the player to do the subtraction.
   */
  const withReason = (detail: string, price: number, sold = false): string => {
    if (sold) return t('merchant.sold');
    if (price <= gold) return detail;
    return `${detail} · ${t('merchant.short', { missing: price - gold })}`;
  };

  const gear: ItemCardData[] = shelf.map((entry) => ({
    ...itemCard(entry.item, entry.price),
    id: String(entry.index),
    disabled: entry.sold,
    detail: withReason(statLine(entry.item), entry.price, entry.sold),
  }));

  if (gear.length > 0) {
    categories.push({ id: 'stock', label: t('merchant.stock'), icon: 'icon-chest', items: gear });
  }

  if (merchantId === 'magic') {
    categories.push({
      id: 'potions',
      label: t('merchant.potions'),
      icon: 'icon-potion',
      items: potionStock(bracket).map((potion) => ({
        id: `${POTION_PREFIX}${potion.stat}`,
        icon: potion.icon,
        name: t(potion.nameKey),
        type: t('potion.tier', { tier: potion.tier + 1 }),
        price: potion.price,
        detail: withReason(
          `${t('potion.effect', {
            percent: Math.round(potion.magnitude * 100),
            stat: t(`stat.${potion.stat}` as StringKey),
          })} · ${
            isActive(character.potions, potion.stat, now) ? t('potion.replace') : t('potion.drink')
          }`,
          potion.price,
        ),
      })),
    });
  }

  const shop = track(
    new ShopPanel({
      title: t(merchantId === 'equipment' ? 'merchant.equipment' : 'merchant.magic'),
      merchant: t(
        merchantId === 'equipment' ? 'merchant.equipmentTagline' : 'merchant.magicTagline',
      ),
      categories,
      gold,
      action: t('merchant.buy'),
      width: undefined,
      height: undefined,
      class: 'omf-shop__panel',
    }),
  );
  /**
   * Every row on the shelf carries its full card on hover — what the piece is,
   * what it gives, and what it would change about the hero if it went on. A shop
   * row that shows one stat and a price makes the player buy first and find out
   * afterwards, which is the wrong order (§11).
   *
   * `ShopPanel` builds the rows itself and rebuilds them whenever the tab or the
   * purse changes, so the tips are re-attached from an observer rather than once
   * at construction. Rows are matched to stock by position *within the category
   * the tab strip says is showing* — `Tabs` stamps `data-id` and `aria-selected`
   * on its buttons, which is the same rendered-attribute contract the rail
   * already relies on for its nav ids.
   */
  const showingCategory = (): ShopCategory | undefined => {
    const selected = shop.el
      .querySelector('.fui-shop__tabs [aria-selected="true"]')
      ?.getAttribute('data-id');
    return selected ? categories.find((c) => c.id === selected) : categories[0];
  };

  const tipRows = (): void => {
    const category = showingCategory();
    if (!category) return;
    const rows = shop.el.querySelectorAll<HTMLElement>('.fui-shop__list .fui-itemcard');
    rows.forEach((row, index) => {
      const card = category.items[index];
      if (!card?.id) return;

      if (card.id.startsWith(POTION_PREFIX)) {
        setTip(row, `${card.name} — ${card.detail ?? ''}`);
        return;
      }

      const entry = shelf[Number(card.id)];
      if (!entry) return;
      setTip(
        row,
        itemTooltip(entry.item, {
          compareTo: character.equipment[requireItemDef(entry.item.defId).slot] ?? null,
          hint: entry.sold ? t('merchant.sold') : t('item.buyHint'),
        }),
      );
    });
  };

  const rowObserver = new MutationObserver(tipRows);
  const list = shop.el.querySelector('.fui-shop__list');
  if (list) rowObserver.observe(list, { childList: true });
  tipRows();

  shop.on<ItemCardData>('shop:buy', (card) => {
    if (card.id?.startsWith(POTION_PREFIX)) {
      onDrink(card.id.slice(POTION_PREFIX.length) as UpgradableStatId);
      return;
    }
    const index = Number(card.id);
    if (Number.isInteger(index)) onBuy(index);
  });

  // --- the restock strip ----------------------------------------------------

  const countdown = track(
    new CountdownTimer({
      endsAt: nextRestockAt(state),
      label: t('merchant.restockLabel'),
      glyph: 'glyph-hourglass',
      variant: 'chip',
      doneText: t('merchant.restockNow'),
    }),
  );

  const reroll = track(
    new CostButton({
      label: t('merchant.reroll'),
      cost: rerollCost(bracket.index),
      currencyGlyph: 'icon-coins',
      currency: t('currency.gold'),
      balance: gold,
      size: 'sm',
    }),
  );
  reroll.on('cost:buy', () => onReroll());
  setTip(reroll.el, t('merchant.rerollHint'));

  const tabs = track(
    new Tabs({
      items: [
        { id: 'equipment', label: t('merchant.tab.equipment'), icon: 'icon-sword' },
        { id: 'magic', label: t('merchant.tab.magic'), icon: 'icon-potion' },
      ],
      active: merchantId,
    }),
  );
  tabs.on<{ id: string }>('tabs:change', ({ id }) => {
    if (id !== merchantId) onSwitchMerchant(id as MerchantId);
  });

  // --- the backpack, for selling -------------------------------------------

  const backpack = track(
    new InventoryGrid({
      cols: 4,
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

  // What the merchant would pay, before the click rather than after it.
  for (const [index, item] of character.inventory.entries()) {
    const cell = backpack.el.children[index];
    if (cell instanceof HTMLElement) {
      setTip(cell, itemTooltip(item, { showSellValue: true, hint: t('item.inspect') }));
    }
  }

  const sellPanel = track(
    new Panel({
      title: t('merchant.sellTitle'),
      variant: 'default',
      width: '100%',
      height: '100%',
      scroll: true,
      content:
        character.inventory.length === 0
          ? [h('p', { class: 'omf-shop__empty', text: t('merchant.sellEmpty') })]
          : [backpack.el],
    }),
  );

  // A draught already running says so, rather than looking like a fresh buy.
  const running = potionStock(bracket)
    .filter((potion) => isActive(character.potions, potion.stat, now))
    .map((potion) => t(potion.nameKey));
  const runningLine =
    running.length > 0
      ? h('p', {
          class: 'omf-shop__running',
          text: `${t('character.buffs')}: ${running.join(', ')}`,
        })
      : null;

  const el = h(
    'div',
    { class: 'omf-shop', dataset: { fuiTheme: 'stone-vine', testid: 'merchant' } },
    h(
      'div',
      { class: 'omf-shop__main' },
      tabs.el,
      h('div', { class: 'omf-shop__restock' }, countdown.el, reroll.el),
      shop.el,
    ),
    h('div', { class: 'omf-shop__side' }, ...(runningLine ? [runningLine] : []), sellPanel.el),
  );

  return {
    el,
    destroy() {
      rowObserver.disconnect();
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

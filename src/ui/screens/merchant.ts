/**
 * The merchants (Brief §11/§12, Q16/Q17; UI_FANTASYUI_MAP §5).
 *
 * Both shops are the same screen with different stock, because they *are* the
 * same shop with different stock — one deals in weapons and armour, the other in
 * trinkets and draughts. Giving them separate implementations would mean fixing
 * every bug twice.
 *
 * They are two *destinations* though, not one screen with a tab strip: they hold
 * different goods on their own restock clocks, and a player walks to one or the
 * other already knowing which. The rail picks the door; this screen never has to
 * ask.
 *
 * The two things a shop must always answer are on screen without a click: what
 * the wait costs (the free restock countdown, Q17) and what impatience costs
 * (the reroll price). A shop that only shows the paid option is a shop that is
 * hiding the free one.
 */
import {
  Button,
  CostButton,
  CountdownTimer,
  InventoryGrid,
  Panel,
  ShopPanel,
  h,
  type ItemCardData,
  type ShopCategory,
  type SlotItem,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';

import type { Character } from '@/domain/character/types.ts';
import {
  nextRestockAt,
  potionStock,
  rerollCost,
  stockOf,
  type MerchantId,
} from '@/domain/merchants/merchants.ts';
import { isActive } from '@/domain/potions/potions.ts';
import { getMaterial } from '@/content/items/materials.ts';
import { brewCost, canBrew, transmuteLadder } from '@/domain/items/workbench.ts';
import { bracketForCharacter } from '@/domain/tower/run.ts';
import type { UpgradableStatId } from '@/domain/stats.ts';
import { requireItemDef } from '@/content/items/index.ts';
import {
  compareGear,
  isUpgrade,
  itemCard,
  itemName,
  itemSlot,
  itemTooltip,
  statLine,
} from '@/ui/itemView.ts';
import { setTip } from '@/ui/tooltips.ts';
import { currencyTooltip } from '@/ui/wallet.ts';
import { makeDropTarget, makeItemDraggable } from '@/ui/dragItem.ts';
import { openSellDialog } from '@/ui/sellDialog.ts';
import { refuse } from '@/ui/toasts.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** Card ids are the shelf index for gear and the stat for a draught. */
const POTION_PREFIX = 'potion:';

export interface MerchantScreenOptions {
  /** Backpack size — an account upgrade, so the screen is told rather than assuming. */
  capacity: number;
  character: Character;
  /** Which counter this is. The rail chose it; the screen does not offer a swap. */
  merchantId: MerchantId;
  now: number;
  onBuy: (index: number) => void;
  onDrink: (stat: UpgradableStatId) => void;
  /** Brew a draught from materials instead of gold (Q43). Alchemist only. */
  onBrew: (stat: UpgradableStatId) => void;
  /** Push one rung up the material ladder. Alchemist only. */
  onTransmute: (materialId: string, times: number) => void;
  onReroll: () => void;
  onSelectItem: (uid: string) => void;
  /** Sell a backpack piece — the drop end of a drag onto the shelf. */
  onSell: (uid: string) => void;
}

export interface MerchantScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createMerchantScreen(options: MerchantScreenOptions): MerchantScreen {
  const {
    character,
    capacity,
    merchantId,
    now,
    onBuy,
    onBrew,
    onDrink,
    onReroll,
    onSelectItem,
    onSell,
    onTransmute,
  } = options;
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

  /**
   * A shelf row says whether it beats what the hero is wearing, before it is
   * hovered. Five rows and five hovers is how a player learns to stop reading a
   * shop; the word is the same verdict the tooltip leads with (`compareGear`),
   * so the two can never disagree.
   */
  const shelfDetail = (entry: (typeof shelf)[number]): string => {
    const slot = requireItemDef(entry.item.defId).slot;
    const comparison = compareGear(entry.item, character.equipment[slot] ?? null);
    const line = statLine(entry.item);
    return isUpgrade(comparison) ? `${t('item.compare.upgrade')} · ${line}` : line;
  };

  const gear: ItemCardData[] = shelf.map((entry) => ({
    ...itemCard(entry.item, entry.price),
    id: String(entry.index),
    disabled: entry.sold,
    detail: withReason(shelfDetail(entry), entry.price, entry.sold),
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
      const worn = character.equipment[requireItemDef(entry.item.defId).slot] ?? null;
      setTip(
        row,
        itemTooltip(entry.item, {
          compareTo: worn,
          hint: entry.sold ? t('merchant.sold') : t('item.buyHint'),
        }),
      );
      if (!entry.sold && isUpgrade(compareGear(entry.item, worn))) {
        row.classList.add('omf-upgrade');
      }
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

  // The counter's purse says what gold is and where it comes from, like every
  // other balance in the game (`wallet.ts`).
  const purse = shop.el.querySelector<HTMLElement>('.fui-shop__purse');
  if (purse) setTip(purse, currencyTooltip('gold', gold));

  // --- the backpack, for selling -------------------------------------------

  const backpack = track(
    new InventoryGrid({
      cols: 4,
      size: capacity,
      items: character.inventory.map((item) => itemSlot(item)),
      slotSize: 'md',
      draggable: false,
      placeholder: 'slot-stone-md',
    }),
  );
  backpack.on<{ item: SlotItem | null }>('inventory:click', ({ item }) => {
    if (typeof item?.data === 'string') onSelectItem(item.data);
  });

  const releases: Array<() => void> = [];

  // What the merchant would pay, before the click rather than after it.
  for (const [index, item] of character.inventory.entries()) {
    const cell = backpack.el.children[index];
    if (!(cell instanceof HTMLElement)) continue;
    setTip(cell, itemTooltip(item, { showSellValue: true, hint: t('item.dragToSell') }));
    releases.push(makeItemDraggable(cell, () => ({ uid: item.uid, from: 'backpack' })));
  }

  /**
   * Drag a piece onto the shelf to sell it.
   *
   * The whole shop window is the target rather than a strip of it: a player
   * throwing something at a merchant is not aiming, and a drop zone you have to
   * find is a drop zone that does not work. It asks before it takes — a sale
   * cannot be undone and a drag is a cheap gesture to make by accident.
   */
  releases.push(
    makeDropTarget(shop.el, {
      accepts: (drag) => drag.from === 'backpack',
      onDrop: (drag) => {
        if (drag.from !== 'backpack') {
          refuse(t('item.sellWornTitle'), t('item.sellWornHint'));
          return;
        }
        const item = character.inventory.find((candidate) => candidate.uid === drag.uid);
        if (!item) return;
        openSellDialog({ item, name: itemName(item), onConfirm: () => onSell(item.uid) });
      },
    }),
  );

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

  /**
   * The restock strip belongs *inside* the shop's frame, under its header.
   *
   * It used to sit above the panel beside the merchant tabs, which read as part
   * of the tab strip. With the tabs gone to the rail it was the only thing left
   * floating outside the frame, and a countdown with no window around it reads
   * as debug output. `ShopPanel` only ever rebuilds its list, so a node put in
   * ahead of the list survives every re-render.
   */
  const restock = h('div', { class: 'omf-shop__restock' }, countdown.el, reroll.el);
  const shelfList = shop.el.querySelector('.fui-shop__list');
  if (shelfList) shop.el.insertBefore(restock, shelfList);
  else shop.el.appendChild(restock);

  /**
   * The workbench (Q43), on the Alchemist's counter and nowhere else.
   *
   * Two benches in one panel, because they answer the same question — *what do I
   * do with the materials I have outgrown?* — and a player who has just seen the
   * first is exactly the player who wants the second.
   *
   * Every rung of the ladder is drawn, not only the affordable ones. A bench
   * that stays blank until you are rich enough to use it teaches nobody what it
   * is for, and a row that says "you have 3 of 5" is the clearest possible
   * statement of what to go and get.
   */
  function buildWorkbench(): HTMLElement | null {
    if (merchantId !== 'magic') return null;

    const bench = h('div', { class: 'omf-bench', dataset: { testid: 'workbench' } });

    const ladder = h('ul', { class: 'omf-bench__ladder' });
    for (const step of transmuteLadder(character.materials)) {
      const ready = step.affordable > 0;
      const row = h(
        'li',
        {
          class: 'omf-bench__row',
          dataset: { testid: `transmute-${step.from.id}`, ready: String(ready) },
        },
        h('span', {
          class: 'omf-bench__from',
          text: t('bench.from', {
            count: step.cost,
            name: t(step.from.nameKey as StringKey),
          }),
        }),
        h('span', { class: 'omf-bench__arrow', attrs: { 'aria-hidden': 'true' }, text: '→' }),
        h('span', {
          class: 'omf-bench__to',
          text: t('bench.to', { count: step.yield, name: t(step.to.nameKey as StringKey) }),
        }),
        h('span', {
          class: 'omf-bench__held fui-num',
          text: t('bench.held', { held: step.held }),
        }),
      );

      const make = track(
        new Button({
          label: t('bench.make'),
          size: 'sm',
          variant: ready ? 'primary' : 'ghost',
          disabled: !ready,
        }),
      );
      // One press does one; the same press with the whole stack behind it is the
      // difference between a bench and a chore, so it offers both.
      make.on('click', () => onTransmute(step.from.id, 1));
      setTip(
        make.el,
        ready
          ? t('bench.makeTip', { name: t(step.to.nameKey as StringKey) })
          : t('bench.short', { count: step.cost - (step.held % step.cost) }),
      );
      row.appendChild(make.el);

      if (step.affordable > 1) {
        const all = track(new Button({ label: t('bench.makeAll'), size: 'sm', variant: 'ghost' }));
        all.on('click', () => onTransmute(step.from.id, step.affordable));
        setTip(all.el, t('bench.makeAllTip', { count: step.affordable }));
        row.appendChild(all.el);
      }

      ladder.appendChild(row);
    }
    bench.appendChild(ladder);

    /**
     * Brewing, under the ladder that feeds it.
     *
     * A draught brewed here is drunk on the spot, at the hero's own bracket,
     * exactly like a bought one (Q29) — all that changes is which pocket pays.
     */
    const cost = brewCost(bracket.materialTier);
    const affordable = canBrew(character.materials, bracket.materialTier);
    bench.appendChild(
      h('h4', {
        class: 'omf-bench__subtitle fui-label',
        text: t('bench.brew', {
          count: cost.count,
          name: t((getMaterial(cost.materialId)?.nameKey ?? cost.materialId) as StringKey),
        }),
      }),
    );

    const brews = h('div', { class: 'omf-bench__brews' });
    for (const potion of potionStock(bracket)) {
      const chip = h('button', {
        class: 'omf-bench__brew',
        attrs: { type: 'button' },
        dataset: { testid: `brew-${potion.stat}` },
        text: t(`stat.${potion.stat}` as StringKey),
      });
      if (!affordable) chip.disabled = true;
      else chip.addEventListener('click', () => onBrew(potion.stat));
      setTip(chip, {
        title: t(potion.nameKey),
        subtitle: t('bench.brewCost', {
          count: cost.count,
          name: t((getMaterial(cost.materialId)?.nameKey ?? cost.materialId) as StringKey),
        }),
        flavor: affordable
          ? t('potion.effect', {
              percent: Math.round(potion.magnitude * 100),
              stat: t(`stat.${potion.stat}` as StringKey),
            })
          : t('bench.brewShort'),
      });
      brews.appendChild(chip);
    }
    bench.appendChild(brews);

    // Framed like every other block on the screen: an unframed panel beside a
    // framed one is the fastest way to make a game look like a web app (§20.1).
    return track(
      new Panel({
        title: t('bench.title'),
        subtitle: t('bench.hint'),
        variant: 'alt',
        width: '100%',
        height: '100%',
        scroll: true,
        content: [bench],
      }),
    ).el;
  }

  const workbench = buildWorkbench();

  const el = h(
    'div',
    { class: 'omf-shop', dataset: { fuiTheme: 'stone-vine', testid: 'merchant' } },
    h('div', { class: 'omf-shop__main' }, shop.el, ...(workbench ? [workbench] : [])),
    h('div', { class: 'omf-shop__side' }, ...(runningLine ? [runningLine] : []), sellPanel.el),
  );

  return {
    el,
    destroy() {
      rowObserver.disconnect();
      for (const release of releases) release();
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

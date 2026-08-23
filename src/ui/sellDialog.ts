/**
 * The sell confirmation.
 *
 * A sale cannot be undone and a drag is a cheap gesture to make by accident, so
 * dropping a piece on the merchant's shelf asks first. It names the piece, prints
 * what the merchant is offering, and puts the price on the confirm button itself
 * — the number belongs where the decision is made, not only in the sentence
 * above it.
 */
import { Button, Modal, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { commas } from '@/ui/fui/index.ts';
import { itemStatRows } from '@/ui/itemView.ts';
import type { ItemInstance } from '@/domain/items/types.ts';
import { sellValue } from '@/domain/items/upgrade.ts';
import { t } from '@/strings/index.ts';

export interface SellDialogOptions {
  item: ItemInstance;
  name: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface SellDialog {
  close(): void;
}

export function openSellDialog(options: SellDialogOptions): SellDialog {
  const { item, name, onConfirm, onCancel } = options;
  const parts: FuiComponent[] = [];
  const gold = sellValue(item);

  const confirm = new Button({
    label: t('item.sellConfirm', { gold: commas(gold) }),
    variant: 'primary',
  });
  const cancel = new Button({ label: t('item.sellCancel'), variant: 'ghost' });
  parts.push(confirm, cancel);

  // What is being given up, so the decision is made on the piece rather than on
  // its name — the same rows the tooltip shows.
  const stats = h(
    'ul',
    { class: 'omf-sell__stats' },
    ...itemStatRows(item).map((row) =>
      h(
        'li',
        null,
        h('span', { text: row.label }),
        h('span', { class: 'fui-num', text: String(row.value) }),
      ),
    ),
  );

  const modal = new Modal({
    title: t('item.sellTitle', { name }),
    content: [
      h('p', { class: 'omf-sell__body', text: t('item.sellBody', { gold: commas(gold) }) }),
      stats,
      h('div', { class: 'omf-sell__actions' }, cancel.el, confirm.el),
    ],
    width: 460,
    closable: true,
  });
  parts.push(modal);

  let done = false;
  const teardown = (): void => {
    if (done) return;
    done = true;
    for (const part of parts) part.destroy();
  };

  confirm.on('click', () => {
    teardown();
    onConfirm();
  });
  cancel.on('click', () => {
    teardown();
    onCancel?.();
  });
  modal.on('modal:close', () => {
    teardown();
    onCancel?.();
  });

  modal.open();
  return { close: teardown };
}

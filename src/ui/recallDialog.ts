/**
 * "Call them back?" — the confirmation a recall deserves (Q37).
 *
 * A recall throws away everything a party has spent hours earning, and it is one
 * click away from a button labelled with a timer. It asks first, and it asks
 * with the two facts that decide the answer in the sentence: how long is left,
 * and that coming home early pays nothing.
 */
import { Button, Modal, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { t } from '@/strings/index.ts';

export interface RecallDialogOptions {
  /** How long the party still has, already formatted. */
  time: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function openRecallDialog(options: RecallDialogOptions): { close(): void } {
  const { time, onConfirm, onCancel } = options;
  const parts: FuiComponent[] = [];

  const confirm = new Button({ label: t('expedition.recallConfirm'), variant: 'primary' });
  const cancel = new Button({ label: t('expedition.recallCancel'), variant: 'ghost' });
  parts.push(confirm, cancel);

  const modal = new Modal({
    title: t('expedition.recallTitle'),
    content: [
      h('p', { class: 'omf-respec__body', text: t('expedition.recallBody', { time }) }),
      h('div', { class: 'omf-respec__actions' }, cancel.el, confirm.el),
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

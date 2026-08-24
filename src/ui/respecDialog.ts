/**
 * "Unlearn everything?" — the confirmation a respec deserves (Q38).
 *
 * A respec is the one action in the tree that cannot be undone by spending more
 * points, so it asks first, and it asks with the two numbers that decide the
 * answer in the sentence rather than in a tooltip: what it costs, and how many
 * points come back.
 */
import { Button, Modal, commas, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { t } from '@/strings/index.ts';

export interface RespecDialogOptions {
  cost: number;
  points: number;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface RespecDialog {
  close(): void;
}

export function openRespecDialog(options: RespecDialogOptions): RespecDialog {
  const { cost, points, onConfirm, onCancel } = options;
  const parts: FuiComponent[] = [];

  const confirm = new Button({
    label: t('talent.respecConfirm', { cost: commas(cost) }),
    variant: 'primary',
  });
  const cancel = new Button({ label: t('talent.respecCancel'), variant: 'ghost' });
  parts.push(confirm, cancel);

  const modal = new Modal({
    title: t('talent.respecTitle'),
    content: [
      h('p', {
        class: 'omf-respec__body',
        text: t('talent.respecBody', { cost: commas(cost), points: commas(points) }),
      }),
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

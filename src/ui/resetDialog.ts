/**
 * The reset confirmation (Brief §19, Q4).
 *
 * A reset erases a character completely and cannot be undone, so the dialog asks
 * for the one thing a misclick cannot produce: the hero's name, typed out. It
 * also says what a reset does *not* touch — account upgrades survive — because
 * the fear of losing those is what would otherwise stop someone using this.
 */
import { Button, Modal, TextInput, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { nameKey } from '@/domain/character/naming.ts';
import { t } from '@/strings/index.ts';

export interface ResetDialogOptions {
  heroName: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ResetDialog {
  close(): void;
}

export function openResetDialog(options: ResetDialogOptions): ResetDialog {
  const { heroName, onConfirm, onCancel } = options;
  const parts: FuiComponent[] = [];

  const confirm = new Button({
    label: t('reset.confirm'),
    variant: 'primary',
    disabled: true,
    class: 'omf-danger',
  });
  const cancel = new Button({ label: t('reset.cancel'), variant: 'ghost' });
  const field = new TextInput({
    placeholder: heroName,
    width: '100%',
    onInput: (value) => {
      // Enabled only on an exact match, ignoring case and stray spacing — the
      // same normalisation the name was stored with.
      confirm.setDisabled(nameKey(value) !== nameKey(heroName));
    },
  });
  parts.push(confirm, cancel, field);

  const modal = new Modal({
    title: t('reset.title', { name: heroName }),
    content: [
      h('p', { class: 'omf-reset__warning', text: t('reset.warning', { name: heroName }) }),
      h('p', { class: 'omf-reset__prompt', text: t('reset.prompt', { name: heroName }) }),
      field.el,
      h('div', { class: 'omf-reset__actions' }, cancel.el, confirm.el),
    ],
    width: 520,
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
    if (confirm.el.hasAttribute('disabled')) return;
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
  field.focus();

  return { close: teardown };
}

/**
 * The in-game error surface.
 *
 * A crash must never leave the player looking at a blank page or a browser
 * dialog (ARCHITECTURE §5). This renders the failure inside the game's own
 * language, says plainly that the save was not touched, and offers the one
 * action that helps. Recovery from an earlier save generation arrives in M1 and
 * plugs in here.
 */
import { Button, EmptyState, Panel, h } from '@/ui/fui/index.ts';
import { t } from '@/strings/index.ts';

export interface ErrorPanelOptions {
  mount: HTMLElement;
  error: unknown;
  onReload?: () => void;
}

export function renderErrorPanel(options: ErrorPanelOptions): void {
  const { mount, error, onReload } = options;
  const detail = error instanceof Error ? error.message : String(error);

  const reload = new Button({ label: t('error.reload'), variant: 'primary' });
  reload.on('click', () => onReload?.());

  const state = new EmptyState({
    glyph: 'glyph-cursed-eye',
    title: t('error.title'),
    message: t('error.message'),
    extra: [h('p', { class: 'omf-error__detail', text: t('error.detail', { detail }) }), reload.el],
  });

  const panel = new Panel({ variant: 'alt', width: 560, content: state.el });

  mount.replaceChildren(
    h('div', { class: 'omf-error', dataset: { fuiTheme: 'dark-ember' } }, panel.el),
  );
}

/**
 * Shown when another tab already holds the session lock (SAVE_SCHEMA §8).
 *
 * This is not an error: the game is working exactly as intended by refusing to
 * let two copies overwrite each other. It says so in those terms.
 */
export function renderLockGate(mount: HTMLElement): void {
  const state = new EmptyState({
    glyph: 'glyph-broken-shackle',
    title: t('lock.title'),
    message: t('lock.message'),
  });

  const panel = new Panel({ variant: 'alt', width: 560, content: state.el });

  mount.replaceChildren(
    h(
      'div',
      { class: 'omf-error', dataset: { fuiTheme: 'stone-vine', testid: 'lock-gate' } },
      panel.el,
    ),
  );
}

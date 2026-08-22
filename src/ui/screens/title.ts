/**
 * Title screen — the first thing the player sees.
 *
 * FantasyUI's `TitleGate` carries the whole look; naming the hero *is* the
 * account (Brief §5/§21), so there is no login here and never will be. The
 * server picker the component offers is deliberately unused: this game has no
 * server (Brief §2.2).
 */
import { TitleGate } from '@/ui/fui/index.ts';
import type { Screen } from '@/app/router.ts';
import { t } from '@/strings/index.ts';

export interface TitleScreenOptions {
  /** Build label shown in the small print under the button. */
  version: string;
  onEnter: () => void;
}

export function createTitleScreen(options: TitleScreenOptions): Screen {
  const gate = new TitleGate({
    title: t('app.title'),
    tagline: t('app.tagline'),
    action: t('app.enter'),
    footnote: t('app.build', { version: options.version }),
    art: 'bg-scene-dark',
    figure: 'silhouette-warrior-m',
    figureSide: 'right',
    height: '100vh',
    theme: 'dark-ember',
  });

  gate.on('gate:enter', () => options.onEnter());

  return gate;
}

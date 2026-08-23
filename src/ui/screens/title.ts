/**
 * Title screen — the first thing the player sees.
 *
 * `TitleGate` carries the look; naming the hero *is* the account (Brief §5/§21),
 * so there is no login here and never will be, and the server picker the
 * component offers is deliberately unused — this game has no server (§2.2).
 *
 * Two things were making this read as a prototype rather than a front door.
 *
 * The first was emptiness: a title, a line under it and a button, floating in
 * the left third of a black frame. A front door should say what is behind it, so
 * the roster stands on it — five painted faces with their names and their hooks,
 * which is the game's own pitch made in one glance rather than in a sentence.
 *
 * The second was the key art. The gate paints its `figure` as a hard-edged
 * rectangle, which suits a cut-out silhouette; our class art is a *square bust
 * on a painted field*, so it landed as an orange slab with a visible seam down
 * the middle of the screen. It is good art badly framed, and the fix belongs in
 * the stylesheet (`.omf-title`, app.css), where the plate is masked back into
 * the dark on every edge and lit from behind — the standard treatment for key
 * art that has a background of its own.
 */
import { Divider, Portrait, TitleGate, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { CLASSES } from '@/content/classes/index.ts';
import { CLASS_IDS } from '@/domain/character/types.ts';
import type { Screen } from '@/app/router.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

export interface TitleScreenOptions {
  /** Build label shown in the small print under the button. */
  version: string;
  onEnter: () => void;
}

/** The class whose art carries the screen. */
const HERO_CLASS = 'warrior';

export function createTitleScreen(options: TitleScreenOptions): Screen {
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  /**
   * The five who can climb it.
   *
   * Each face carries its own name, so the roster reads without hovering, and
   * the hook behind it rewards the player who does. Five classes is the answer
   * to "what is this game", and five faces give it faster than a sentence.
   */
  const cast = h(
    'div',
    { class: 'omf-title__cast', dataset: { testid: 'title-cast' } },
    ...CLASS_IDS.map((classId) => {
      const definition = CLASSES[classId];
      const portrait = track(
        new Portrait({
          art: definition.art.portrait,
          shape: 'square',
          size: 72,
          fit: 'cover',
        }),
      );
      const member = h(
        'div',
        { class: 'omf-title__member' },
        portrait.el,
        h('span', { class: 'omf-title__member-name', text: t(definition.nameKey) }),
      );
      setTip(member, {
        title: t(definition.nameKey),
        subtitle: t(definition.taglineKey),
        hint: t(definition.weaponDescriptionKey),
      });
      return member;
    }),
  );

  /**
   * The etched rule labels the roster instead of merely separating it. The
   * painted vine ornament is centred art at a fixed aspect, so in a column this
   * wide it floats as a small badge in the middle of nothing; the rule spans the
   * panel and carries a caption, which is what this row needed.
   */
  const rule = track(new Divider({ variant: 'rule', label: t('app.cast') }));

  const gate = track(
    new TitleGate({
      title: t('app.title'),
      tagline: t('app.tagline'),
      action: t('app.enter'),
      footnote: t('app.build', { version: options.version }),
      art: 'bg-scene-dark',
      figure: CLASSES[HERO_CLASS].art.portrait,
      figureSide: 'right',
      height: '100vh',
      theme: 'dark-ember',
      class: 'omf-title',
      extra: [rule.el, cast],
    }),
  );

  gate.on('gate:enter', () => options.onEnter());

  return {
    el: gate.el,
    destroy() {
      for (const part of parts) part.destroy();
      gate.el.remove();
    },
  };
}

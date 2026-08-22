/**
 * Effect chips — the one place an effect becomes a picture (Brief §3.2, §20.4).
 *
 * Both the tower's floor preview and the fight itself show the same modifiers,
 * so they render them the same way: FantasyUI's `BuffBar`, an icon derived from
 * what the effect does, and its duration stated in full rather than counted
 * down. A chip that lies about how long it has left is worse than one that
 * simply says "3 rounds", and the script tells us exactly when it ends anyway.
 */
import type { Buff } from '@/ui/fui/index.ts';
import type { EffectDef } from '@/domain/combat/types.ts';
import { t, type StringKey } from '@/strings/index.ts';
import { iconForEffect } from './effectIcons.ts';

export function effectChip(effect: EffectDef): Buff {
  const duration =
    effect.duration === 'wholeFight'
      ? t('combat.effect.wholeFight')
      : t('combat.effect.rounds', { rounds: effect.duration });

  return {
    id: effect.id,
    icon: iconForEffect(effect),
    // `BuffBar` renders this as the chip's explanation. It reaches the DOM as a
    // native `title`, which the tooltip service adopts into a real FantasyUI
    // tooltip before a browser one can ever appear (Brief §20.4).
    name: t('combat.effect.tooltip', { name: t(effect.nameKey as StringKey), duration }),
    kind: effect.tone,
  };
}

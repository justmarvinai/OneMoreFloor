/**
 * Effect chips — the one place an effect becomes a picture (Brief §3.2, §20.4).
 *
 * Both the tower's floor preview and the fight itself show the same modifiers,
 * so they render them the same way: FantasyUI's `BuffBar`, an icon derived from
 * what the effect does, and its duration stated in full rather than counted
 * down. A chip that lies about how long it has left is worse than one that
 * simply says "3 rounds", and the script tells us exactly when it ends anyway.
 *
 * The chip also has to say **what the effect does**. "Rusted — Whole fight" tells
 * a player nothing they can act on; "Defence 10% lower, for the whole fight"
 * tells them whether this floor is worth a draught first. That sentence is
 * derived from the effect's own data rather than authored per effect, so a new
 * debuff describes itself the moment it is added (CONTENT_PIPELINE §2).
 */
import type { Buff, TooltipOptions, TooltipStat } from '@/ui/fui/index.ts';
import type { EffectDef } from '@/domain/combat/types.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';
import { iconForEffect } from './effectIcons.ts';

export function effectChip(effect: EffectDef): Buff {
  return {
    id: effect.id,
    icon: iconForEffect(effect),
    // `BuffBar` renders this as the chip's explanation. It reaches the DOM as a
    // native `title`, which the tooltip service adopts into a real FantasyUI
    // tooltip before a browser one can ever appear (Brief §20.4) — and which
    // `tipEffects` then replaces with the full card.
    name: t('combat.effect.tooltip', {
      name: t(effect.nameKey as StringKey),
      duration: durationOf(effect),
    }),
    kind: effect.tone,
  };
}

/** "Whole fight", or "3 rounds". */
function durationOf(effect: EffectDef): string {
  return effect.duration === 'wholeFight'
    ? t('combat.effect.wholeFight')
    : t('combat.effect.rounds', { rounds: effect.duration });
}

/** The full card: what it is, what it does to which number, and for how long. */
export function effectTooltip(effect: EffectDef): TooltipOptions {
  const stats: TooltipStat[] = [];

  if (effect.kind === 'statScale' && effect.stat) {
    const percent = Math.round(Math.abs(effect.magnitude) * 100);
    stats.push({
      label: t(`stat.${effect.stat}` as StringKey),
      value: `${effect.magnitude < 0 ? '−' : '+'}${percent}%`,
      tone: effect.magnitude < 0 ? 'bad' : 'good',
    });
  } else if (effect.kind === 'damageReduction') {
    stats.push({
      label: t('effect.kind.damageReduction'),
      value: `−${Math.round(Math.abs(effect.magnitude) * 100)}%`,
      tone: effect.tone === 'buff' ? 'good' : 'bad',
    });
  }

  stats.push({ label: t('effect.lasts'), value: durationOf(effect) });

  return {
    title: t(effect.nameKey as StringKey),
    subtitle: t(effect.tone === 'buff' ? 'effect.buff' : 'effect.debuff'),
    stats,
    flavor: describe(effect),
  };
}

/** One sentence, in the player's terms, for what the effect actually does. */
function describe(effect: EffectDef): string {
  const percent = Math.round(Math.abs(effect.magnitude) * 100);

  switch (effect.kind) {
    case 'statScale': {
      if (!effect.stat) return '';
      const stat = t(`stat.${effect.stat}` as StringKey);
      return effect.magnitude < 0
        ? t('effect.describe.lower', { stat, percent })
        : t('effect.describe.raise', { stat, percent });
    }
    case 'damageReduction':
      return t('effect.describe.damageReduction', { percent });
    case 'dodgeNext':
      return t('effect.describe.dodgeNext');
  }
}

/**
 * Attach the full cards to a rendered `BuffBar`.
 *
 * The component owns its cells and puts no ids on them, so they are paired with
 * their effects by position — they are rendered in the order the buffs were
 * given (the same assumption, and the same reason, as the paperdoll's sockets;
 * see UI_FANTASYUI_MAP §10).
 */
export function tipEffects(bar: HTMLElement, effects: readonly EffectDef[]): void {
  const cells = bar.querySelectorAll<HTMLElement>('.fui-buffs__item');
  cells.forEach((cell, index) => {
    const effect = effects[index];
    if (effect) setTip(cell, effectTooltip(effect));
  });
}

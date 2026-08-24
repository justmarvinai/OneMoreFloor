/**
 * The Boss Rush summary (Q39).
 *
 * Ten boss fights is not something anyone watches, so the rush resolves in one
 * pass and this screen performs the aftermath — the same shape the Quick-Raid
 * summary uses, for the same reason: the outcome was never a product of the
 * animation (Q8).
 *
 * What it has to say is one sentence and a ladder. The sentence is whether this
 * was further than before, because that is the only thing the rush pays for; the
 * ladder is which gate stopped you, because that is the only thing that tells a
 * player what to go and fix.
 */
import { LootWindow, ResultScreen, h, type ResultStat } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { BOSS_RUSH_GATES, RUSH_BOSSES, type BossRushResult } from '@/domain/bossRush/bossRush.ts';
import { lootCards, rewardChips } from '@/ui/loot.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface BossRushScreenOptions {
  result: BossRushResult;
  onContinue: () => void;
}

export interface BossRushScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createBossRushScreen(options: BossRushScreenOptions): BossRushScreen {
  const { result, onContinue } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const last = result.gates[result.gates.length - 1];
  const stats: ResultStat[] = [
    { label: t('rush.cleared'), value: `${result.cleared} / ${BOSS_RUSH_GATES}` },
    { label: t('rush.healthLeft'), value: Math.max(0, last?.heroHpRemaining ?? 0) },
  ];

  const title =
    result.cleared === BOSS_RUSH_GATES
      ? t('rush.resultAll')
      : result.cleared === 0
        ? t('rush.resultNone')
        : result.isRecord
          ? t('rush.resultRecord', { count: result.cleared, max: BOSS_RUSH_GATES })
          : t('rush.resultTitle', { count: result.cleared, max: BOSS_RUSH_GATES });

  const subtitle = result.isRecord
    ? t('rush.subtitleRecord')
    : result.cleared === result.previousBest
      ? t('rush.subtitleTied')
      : t('rush.subtitleShort', { best: result.previousBest });

  const screen = track(
    new ResultScreen({
      // Never a defeat: a rush that ended early cost the player nothing, and a
      // screen that called it a loss would be the reason nobody ran a second.
      outcome: result.cleared > 0 ? 'victory' : 'defeat',
      // Not fullscreen: `ResultScreen` pins itself to the viewport by default,
      // which would put the ladder underneath it rather than beside it — and the
      // ladder is the half of this screen a player actually acts on.
      fullscreen: false,
      title,
      subtitle,
      stats,
      rewards: rewardChips(result.reward),
      xp: result.reward.xp,
      gold: result.reward.gold,
      actions: [{ id: 'continue', label: t('rush.close'), primary: true }],
    }),
  );
  screen.on('result:action', () => onContinue());

  /** The ladder: every gate, whether it was reached, and what stopped the run. */
  const ladder = h('div', { class: 'omf-rush__ladder', dataset: { testid: 'rush-ladder' } });
  for (const [index, boss] of RUSH_BOSSES.entries()) {
    const gate = result.gates[index];
    const state = gate === undefined ? 'untouched' : gate.cleared ? 'held' : 'fell';

    const row = h(
      'div',
      { class: 'omf-rush__gate', dataset: { state, testid: `rush-gate-${index + 1}` } },
      h('span', { class: 'omf-rush__index', text: t('rush.gate', { index: index + 1 }) }),
      h('span', { class: 'omf-rush__boss fui-title', text: t(boss.nameKey as StringKey) }),
      h('span', {
        class: 'omf-rush__floor fui-num',
        text: gate ? t('rush.gateFloor', { floor: gate.floor }) : '',
      }),
      h('span', {
        class: 'omf-rush__state',
        text:
          state === 'held'
            ? t('rush.held')
            : state === 'fell'
              ? t('rush.fell')
              : t('rush.untouched'),
      }),
    );
    setTip(row, {
      title: t(boss.nameKey as StringKey),
      ...(gate ? { subtitle: t('rush.gateFloor', { floor: gate.floor }) } : {}),
      flavor:
        state === 'untouched'
          ? t('rush.untouched')
          : state === 'held'
            ? t('rush.held')
            : t('rush.fell'),
    });
    ladder.appendChild(row);
  }

  const children: HTMLElement[] = [screen.el, ladder];
  if (result.reward.items.length > 0) {
    const loot = track(
      new LootWindow({ title: t('loot.title'), items: lootCards(result.reward.items) }),
    );
    children.push(loot.el);
  }

  const el = h(
    'div',
    { class: 'omf-rush', dataset: { fuiTheme: 'stone-vine', testid: 'boss-rush' } },
    ...children,
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

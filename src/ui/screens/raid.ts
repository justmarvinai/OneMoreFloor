/**
 * The Quick-Raid summary (Brief §3.4, Q8).
 *
 * A raid resolves every floor for real and stops the moment the hero would die,
 * so this screen has two things to say: how far the climb got, and everything it
 * brought back. The loot is rendered by the same code a watched fight uses,
 * because it *is* the same loot — that is the whole point of the guarantee.
 */
import { LootWindow, ResultScreen, h, type ResultStat } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import type { QuickRaidResult } from '@/domain/tower/run.ts';
import { lootCards, rewardChips } from '@/ui/loot.ts';
import { t } from '@/strings/index.ts';

export interface RaidScreenOptions {
  result: QuickRaidResult;
  onContinue: () => void;
}

export interface RaidScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createRaidScreen(options: RaidScreenOptions): RaidScreen {
  const { result, onContinue } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const cleared = result.floors.filter((floor) => floor.cleared).length;
  const stats: ResultStat[] = [
    { label: t('raid.floors'), value: cleared },
    { label: t('result.healthLeft'), value: lastHealth(result) },
  ];

  const screen = track(
    new ResultScreen({
      outcome: result.died ? 'defeat' : 'victory',
      title: result.died ? t('raid.titleDied') : t('raid.title'),
      subtitle: result.died
        ? t('raid.subtitleDied', { floor: result.character.tower.currentRunFloor, count: cleared })
        : t('raid.subtitle', { count: cleared, floor: result.reachedFloor }),
      stats,
      rewards: rewardChips(result.reward),
      xp: result.reward.xp,
      gold: result.reward.gold,
      actions: [{ id: 'continue', label: t('raid.close'), primary: true }],
    }),
  );
  screen.on('result:action', () => onContinue());

  const children: HTMLElement[] = [screen.el];
  if (result.reward.items.length > 0) {
    const loot = track(
      new LootWindow({
        title: t('loot.title'),
        items: lootCards(result.reward.items),
        takeAllLabel: t('loot.take'),
        width: 380,
      }),
    );
    children.push(loot.el);
  }

  const el = h(
    'div',
    { class: 'omf-raid', dataset: { fuiTheme: 'dark-ember', testid: 'raid' } },
    h('div', { class: 'omf-result' }, ...children),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** Health at the end of the raid — the last fight's, or full if none was fought. */
function lastHealth(result: QuickRaidResult): number {
  const last = result.floors[result.floors.length - 1];
  return last ? last.script.outcome.heroHpRemaining : 0;
}

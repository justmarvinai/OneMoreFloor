/**
 * Records — what this hero has done, and what it cost.
 *
 * A roguelike's deaths are its content. Until now a run ended, the tower reset,
 * and the only thing left of it was one number in the rail — so a player had no
 * way to tell whether they were getting further or merely getting used to it.
 * This screen is where a run becomes data: how deep, how long, how much it paid,
 * and what stopped it.
 *
 * It is one screen rather than two because the bestiary belongs to the same
 * question — *what have I actually seen?* — and a rail entry per list would be
 * two destinations that a player always visits together.
 */
import { OrnateHeader, Panel, StatChip, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { commas } from '@/ui/fui/index.ts';
import { RUN_HISTORY_LIMIT } from '@/domain/tower/run.ts';
import { getEnemy } from '@/content/enemies/index.ts';
import type { Character } from '@/domain/character/types.ts';
import type { Screen } from '@/app/router.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

export interface RecordsScreenOptions {
  character: Character;
}

export function createRecordsScreen(options: RecordsScreenOptions): Screen {
  const { character } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const runs = character.tower.history;

  /**
   * One finished run.
   *
   * Ordered by what a player actually wants from the list: how far — the number
   * they are trying to beat — then what it paid and what stopped it. The date is
   * last because it is the least interesting thing about a death.
   */
  const runRow = (run: (typeof runs)[number], index: number): HTMLElement => {
    const enemy = run.killedBy ? getEnemy(run.killedBy) : undefined;
    const name = enemy ? t(enemy.nameKey) : '—';
    const row = h(
      'li',
      { class: 'omf-records__run', dataset: { testid: `run-${index}` } },
      h('span', {
        class: 'omf-records__run-floor fui-num',
        text: t('records.run.reached', { floor: run.floor }),
      }),
      h('span', {
        class: 'omf-records__run-died',
        text: t('records.run.died', { floor: run.diedOn, name }),
      }),
      h('span', {
        class: 'omf-records__run-gold fui-num',
        text: t('records.run.gold', { gold: commas(run.gold) }),
      }),
      h('span', {
        class: 'omf-records__run-fights fui-num',
        text: t('records.run.fights', { fights: run.fights }),
      }),
    );
    setTip(
      row,
      t('records.run.tip', {
        floor: run.floor,
        gold: commas(run.gold),
        fights: run.fights,
        died: run.diedOn,
        name,
      }),
    );
    return row;
  };

  const best = track(
    new StatChip({
      label: t('records.best'),
      value: character.tower.highestFloorEverCleared,
      glyph: 'glyph-trophy-cup',
      tone: 'gold',
      size: 'sm',
    }),
  );

  const runsPanel = track(
    new Panel({
      title: t('records.runs'),
      subtitle: t('records.runsHint', { count: RUN_HISTORY_LIMIT }),
      variant: 'alt',
      width: '100%',
      height: '100%',
      scroll: true,
      content:
        runs.length === 0
          ? [h('p', { class: 'omf-records__empty', text: t('records.runsEmpty') })]
          : [
              h('div', { class: 'omf-records__best' }, best.el),
              h('ul', { class: 'omf-records__runs' }, ...runs.map(runRow)),
            ],
    }),
  );

  const el = h(
    'div',
    { class: 'omf-records', dataset: { fuiTheme: 'stone-vine', testid: 'records' } },
    track(new OrnateHeader({ title: t('records.title'), subtitle: t('records.subtitle') })).el,
    h('div', { class: 'omf-records__body' }, runsPanel.el),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

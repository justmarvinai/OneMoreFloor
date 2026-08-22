/**
 * The quest board (Brief §17, Q10/Q21; UI_FANTASYUI_MAP §7).
 *
 * Three dailies and three weeklies, each showing what it asks for, how far along
 * it is, and exactly what it pays — before the player decides whether to chase
 * it. The countdown to reset sits above each column, because "is it worth
 * starting this now?" is the question a quest board exists to answer.
 *
 * The board is composed from `Panel`, `StatBar`, `Badge` and `CountdownTimer`
 * rather than from FantasyUI's `QuestBoard`: that component models *contracts*
 * a player accepts and abandons, and carries no progress. Ours are always
 * active and always counting. Recorded as an upstream wish (UI_FANTASYUI_MAP §10).
 */
import {
  Badge,
  Button,
  CountdownTimer,
  OrnateHeader,
  Panel,
  StatBar,
  commas,
  h,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { questTemplate } from '@/content/quests/index.ts';
import type { QuestCadence } from '@/content/quests/types.ts';
import { getMaterial } from '@/content/items/materials.ts';
import type { Character } from '@/domain/character/types.ts';
import { isClaimable, isComplete, type QuestState } from '@/domain/quests/quests.ts';
import { nextDayBoundary, nextWeekBoundary } from '@/app/time.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface QuestScreenOptions {
  character: Character;
  now: number;
  onClaim: (cadence: QuestCadence, index: number) => void;
}

export interface QuestScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createQuestScreen(options: QuestScreenOptions): QuestScreen {
  const { character, now, onClaim } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  function column(cadence: QuestCadence, endsAt: number): HTMLElement {
    const board = character.quests[cadence];

    const countdown = track(
      new CountdownTimer({
        endsAt,
        label: t('quest.resetsIn'),
        glyph: 'glyph-hourglass',
        variant: 'chip',
      }),
    );

    const cards =
      board.quests.length === 0
        ? [h('p', { class: 'omf-quests__empty', text: t('quest.none') })]
        : board.quests.map((quest, index) => card(cadence, quest, index));

    return track(
      new Panel({
        title: t(cadence === 'daily' ? 'quest.daily' : 'quest.weekly'),
        variant: 'default',
        width: '100%',
        height: '100%',
        scroll: true,
        content: [h('div', { class: 'omf-quests__reset' }, countdown.el), ...cards],
      }),
    ).el;
  }

  function card(cadence: QuestCadence, quest: QuestState, index: number): HTMLElement {
    const template = questTemplate(quest.templateId);
    const name = template ? t(template.nameKey) : quest.templateId;
    const objective = template
      ? t(`quest.objective.${template.objective}` as StringKey, { target: commas(quest.target) })
      : '';

    const bar = track(
      new StatBar({
        kind: isComplete(quest) ? 'xp' : 'mana',
        value: Math.min(quest.progress, quest.target),
        max: quest.target,
        readout: 'ratio',
        width: '100%',
      }),
    );

    const head = h(
      'div',
      { class: 'omf-quests__head' },
      h('span', { class: 'omf-quests__name fui-title', text: name }),
    );

    if (template?.difficulty === 'hard') {
      head.appendChild(track(new Badge({ text: t('quest.hard'), tone: 'danger' })).el);
    }

    const action = track(
      new Button({
        label: quest.claimed ? t('quest.claimed') : t('quest.claim'),
        variant: isClaimable(quest) ? 'primary' : 'ghost',
        disabled: !isClaimable(quest),
        size: 'sm',
      }),
    );
    action.on('click', () => {
      if (isClaimable(quest)) onClaim(cadence, index);
    });

    return h(
      'div',
      {
        class: 'omf-quests__card',
        dataset: { testid: 'quest-card', claimable: String(isClaimable(quest)) },
      },
      head,
      h('p', { class: 'omf-quests__objective', text: objective }),
      bar.el,
      h(
        'div',
        { class: 'omf-quests__foot' },
        h('span', { class: 'omf-quests__reward', text: rewardLine(quest) }),
        action.el,
      ),
    );
  }

  const el = h(
    'div',
    { class: 'omf-quests', dataset: { fuiTheme: 'stone-vine', testid: 'quests' } },
    track(new OrnateHeader({ title: t('quest.title'), size: 'sm' })).el,
    h(
      'div',
      { class: 'omf-quests__columns' },
      column('daily', nextDayBoundary(now)),
      column('weekly', nextWeekBoundary(now)),
    ),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/** What a quest pays, in one line — the read that decides whether to chase it. */
function rewardLine(quest: QuestState): string {
  const parts: string[] = [
    t('quest.rewardGold', { gold: commas(quest.reward.gold) }),
    t('quest.rewardXp', { xp: commas(quest.reward.xp) }),
  ];

  for (const [id, count] of Object.entries(quest.reward.materials)) {
    const material = getMaterial(id);
    if (material && count > 0) {
      parts.push(t('item.materialLine', { count, name: t(material.nameKey as StringKey) }));
    }
  }
  if (quest.reward.tickets > 0) parts.push(t('quest.rewardTicket'));
  if (quest.reward.luckyTickets > 0) parts.push(t('quest.rewardLucky'));

  return parts.join(' · ');
}

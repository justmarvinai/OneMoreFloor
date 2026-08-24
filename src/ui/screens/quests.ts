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
import type { Account, Character } from '@/domain/character/types.ts';
import {
  EXPEDITIONS,
  estimate,
  expeditionsFor,
  parties,
  type ExpeditionDef,
  type PartyStatus,
} from '@/domain/expeditions/expeditions.ts';
import { openRecallDialog } from '@/ui/recallDialog.ts';
import { shortDuration } from '@/ui/format.ts';
import { isClaimable, isComplete, type QuestState } from '@/domain/quests/quests.ts';
import { nextDayBoundary, nextWeekBoundary } from '@/app/time.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface QuestScreenOptions {
  character: Character;
  /** The account, for the expedition board it owns (Q37). */
  account: Account;
  now: number;
  onClaim: (cadence: QuestCadence, index: number) => void;
  /** Send a party out on a route. */
  onSend: (slot: number, id: string) => void;
  /** Take a finished expedition's spoils. */
  onClaimExpedition: (slot: number) => void;
  /** Call a party home early, for nothing. */
  onRecall: (slot: number) => void;
}

export interface QuestScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createQuestScreen(options: QuestScreenOptions): QuestScreen {
  const { character, account, now, onClaim, onSend, onClaimExpedition, onRecall } = options;
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
    // A greyed Claim says why, like every other refusal in the game (§20.5).
    setTip(
      action.el,
      quest.claimed
        ? t('quest.claimedTip')
        : isClaimable(quest)
          ? t('quest.claimableTip')
          : t('quest.remaining', {
              remaining: Math.max(0, Math.ceil(quest.target - quest.progress)),
            }),
    );

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

  /**
   * The expedition board (Q37).
   *
   * On the quest screen rather than a rail destination of its own, because it is
   * the same thing asked in a different tense: a quest board is work you are
   * doing, an expedition board is work being done for you. Both are lists of
   * things you come back to and collect.
   */
  function expeditionBoard(): HTMLElement {
    const record = character.tower.highestFloorEverCleared;
    const routes = expeditionsFor(record);
    const block = h('section', { class: 'omf-expeditions', dataset: { testid: 'expeditions' } });

    block.appendChild(
      h(
        'div',
        { class: 'omf-expeditions__head' },
        h('h3', { class: 'omf-expeditions__title fui-title', text: t('expedition.title') }),
        h('span', { class: 'omf-expeditions__sub', text: t('expedition.subtitle') }),
      ),
    );

    const row = h('div', { class: 'omf-expeditions__parties' });
    for (const party of parties(account, now)) {
      row.appendChild(partyCard(party, routes, record));
    }
    block.appendChild(row);
    return block;
  }

  /** One party slot: out, back, or waiting for orders. */
  function partyCard(
    party: PartyStatus,
    routes: readonly ExpeditionDef[],
    record: number,
  ): HTMLElement {
    const card = h('div', {
      class: 'omf-party',
      dataset: {
        testid: `party-${party.slot}`,
        state: party.state === null ? 'idle' : party.back ? 'ready' : 'away',
      },
    });

    card.appendChild(
      h('span', {
        class: 'omf-party__slot',
        text: t('expedition.slot', { index: party.slot }),
      }),
    );

    if (party.state === null) {
      card.appendChild(h('p', { class: 'omf-party__status', text: t('expedition.idle') }));
      card.appendChild(routeList(party.slot, routes, record));
      return card;
    }

    const name = party.def ? t(party.def.nameKey) : t('expedition.title');
    card.appendChild(h('span', { class: 'omf-party__name fui-title', text: name }));

    if (party.back) {
      card.appendChild(h('p', { class: 'omf-party__status', text: t('expedition.ready') }));
      const claim = track(
        new Button({ label: t('expedition.claim'), size: 'sm', variant: 'primary', block: true }),
      );
      claim.on('click', () => onClaimExpedition(party.slot));
      card.appendChild(claim.el);
      return card;
    }

    // Still away: a live countdown, because "how long?" is the only question a
    // player has in front of this card.
    card.appendChild(
      track(
        new CountdownTimer({
          endsAt: party.state.endsAt,
          label: t('expedition.slot', { index: party.slot }),
          glyph: 'glyph-hourglass',
          variant: 'chip',
        }),
      ).el,
    );

    const recall = track(
      new Button({ label: t('expedition.recall'), size: 'sm', variant: 'ghost', block: true }),
    );
    const left = shortDuration(party.remainingMs);
    recall.on('click', () => {
      openRecallDialog({ time: left, onConfirm: () => onRecall(party.slot) });
    });
    setTip(recall.el, {
      title: t('expedition.recallTitle'),
      flavor: t('expedition.recallBody', { time: left }),
    });
    card.appendChild(recall.el);
    return card;
  }

  /** What this party could be sent on, and what each route pays. */
  function routeList(slot: number, routes: readonly ExpeditionDef[], record: number): HTMLElement {
    const list = h('div', { class: 'omf-party__routes' });

    for (const def of EXPEDITIONS) {
      const open = routes.includes(def);
      const spoils = estimate(def, record);
      const button = track(
        new Button({
          label: `${t(def.nameKey)} · ${t('expedition.hours', { hours: def.hours })}`,
          size: 'sm',
          variant: open ? 'primary' : 'ghost',
          block: true,
          disabled: !open,
        }),
      );
      button.el.dataset.testid = `route-${def.id}`;
      button.on('click', () => onSend(slot, def.id));
      setTip(button.el, {
        title: t(def.nameKey),
        subtitle: t('expedition.hours', { hours: def.hours }),
        stats: [
          {
            label: t('expedition.pays', { gold: '', xp: '', materials: '' })
              .replace(/About.*/, '')
              .trim(),
            value: t('expedition.pays', {
              gold: commas(spoils.gold),
              xp: commas(spoils.xp),
              materials: spoils.materials,
            }),
          },
        ],
        flavor: open
          ? `${t(def.descriptionKey)} ${
              spoils.ticketChance > 0 ? t('expedition.paysTickets') : t('expedition.paysNoTickets')
            }`
          : t('expedition.locked', { floor: def.minFloor }),
      });

      // Why not, on the row rather than a hover away (§20.5).
      const wrap = h('div', { class: 'omf-party__route' }, button.el);
      if (!open) {
        wrap.appendChild(
          h('span', {
            class: 'omf-party__locked',
            text: t('expedition.locked', { floor: def.minFloor }),
          }),
        );
      }
      list.appendChild(wrap);
    }

    return list;
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
    expeditionBoard(),
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

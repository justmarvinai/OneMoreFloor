/**
 * Account upgrades (Brief §15; UI_FANTASYUI_MAP §8).
 *
 * Two upgrades, and the brief says so twice: "Exactly two account upgrades
 * exist in EA 0.1. Do not add more." The screen is built to match — two cards,
 * no registry, no room for a third to appear by accident.
 *
 * Both say what they cost, what they would give, and — when the answer is no —
 * how far short the purse is (§20.5). "Insanely expensive" (§15.1) only reads
 * as a goal rather than a wall if the player can see the distance.
 */
import { CostButton, OrnateHeader, Panel, StatChip, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { BATTLE_SPEED_BY_TIER, MAX_ACCOUNT_SLOTS } from '@/content/balance/account.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import {
  battleSpeedCost,
  nextBattleSpeedTier,
  nextSlot,
  slotCost,
  type UpgradeId,
} from '@/domain/account/upgrades.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

export interface UpgradesScreenOptions {
  account: Account;
  character: Character;
  onBuy: (id: UpgradeId) => void;
}

export interface UpgradesScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createUpgradesScreen(options: UpgradesScreenOptions): UpgradesScreen {
  const { account, character, onBuy } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  const gold = character.currencies.gold;

  function card(
    id: UpgradeId,
    title: string,
    detail: string,
    chip: string,
    cost: number | null,
    nextLabel: string,
    maxedLabel: string,
  ): HTMLElement {
    const body: HTMLElement[] = [
      h('p', { class: 'omf-upgrades__detail', text: detail }),
      h('div', { class: 'omf-upgrades__chip' }, track(new StatChip({ value: chip })).el),
    ];

    if (cost === null) {
      body.push(h('p', { class: 'omf-upgrades__maxed', text: maxedLabel }));
    } else {
      const buy = track(
        new CostButton({
          label: nextLabel,
          cost,
          currencyGlyph: 'icon-coins',
          currency: t('currency.gold'),
          balance: gold,
          block: true,
        }),
      );
      buy.on('cost:buy', () => onBuy(id));
      setTip(
        buy.el,
        gold >= cost
          ? t('upgrades.paidBy', { name: character.identity.name })
          : t('upgrades.short', { missing: cost - gold }),
      );
      body.push(buy.el);
    }

    return track(
      new Panel({
        title,
        variant: 'alt',
        width: '100%',
        content: body,
      }),
    ).el;
  }

  const speedTier = nextBattleSpeedTier(account);
  const speed = card(
    'battleSpeed',
    t('upgrades.battleSpeed'),
    t('upgrades.battleSpeedDetail', { rate: BATTLE_SPEED_BY_TIER[account.battleSpeedTier] }),
    `x${BATTLE_SPEED_BY_TIER[account.battleSpeedTier]}`,
    battleSpeedCost(account),
    speedTier === null
      ? ''
      : t('upgrades.battleSpeedNext', { rate: BATTLE_SPEED_BY_TIER[speedTier] }),
    t('upgrades.battleSpeedMax'),
  );

  const slot = nextSlot(account);
  const slots = card(
    'accountSlot',
    t('upgrades.slots'),
    t('upgrades.slotsDetail', { unlocked: account.slotsUnlocked, max: MAX_ACCOUNT_SLOTS }),
    `${account.slotsUnlocked} / ${MAX_ACCOUNT_SLOTS}`,
    slotCost(account),
    slot === null ? '' : t('upgrades.slotsNext', { slot }),
    t('upgrades.slotsMax'),
  );

  const el = h(
    'div',
    { class: 'omf-upgrades', dataset: { fuiTheme: 'stone-vine', testid: 'upgrades' } },
    track(new OrnateHeader({ title: t('upgrades.title'), subtitle: t('upgrades.subtitle') })).el,
    h('div', { class: 'omf-upgrades__cards' }, speed, slots),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

/**
 * The account screen: upgrades, and credits (Brief §15, §21; UI_FANTASYUI_MAP §8).
 *
 * Two upgrades, and the brief says so twice: "Exactly two account upgrades
 * exist in EA 0.1. Do not add more." The screen is built to match — two cards,
 * no registry, no room for a third to appear by accident.
 *
 * Both say what they cost, what they would give, and — when the answer is no —
 * how far short the purse is (§20.5). "Insanely expensive" (§15.1) only reads
 * as a goal rather than a wall if the player can see the distance.
 */
import { Button, CostButton, OrnateHeader, Panel, StatChip, h } from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import {
  BATTLE_SPEED_BY_TIER,
  MAX_ACCOUNT_SLOTS,
  MAX_BACKPACK_SLOTS,
} from '@/content/balance/account.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import {
  backpackCost,
  battleSpeedCost,
  nextBackpackSize,
  nextBattleSpeedTier,
  nextSlot,
  slotCost,
  type UpgradeId,
} from '@/domain/account/upgrades.ts';
import { CREDITS } from '@/content/credits/index.ts';
import { ECHO_MAX_RANK, echoTree } from '@/domain/account/echoes.ts';
import type { EchoNodeId } from '@/content/balance/echoes.ts';
import { setTip } from '@/ui/tooltips.ts';
import { t } from '@/strings/index.ts';

export interface UpgradesScreenOptions {
  account: Account;
  character: Character;
  onBuy: (id: UpgradeId) => void;
  /** Deepen one node of the echo tree (Q36). */
  onDeepen: (id: string) => void;
}

export interface UpgradesScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createUpgradesScreen(options: UpgradesScreenOptions): UpgradesScreen {
  const { account, character, onBuy, onDeepen } = options;
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

  /**
   * Credits, where a player can actually reach them.
   *
   * `docs/CREDITS.md` records the same list for anyone reading the repository,
   * but CC BY asks for attribution in front of the *audience* — and a file in a
   * source tree is not an audience. This is the screen a player already opens to
   * look at what their account owns, which makes it the honest home for what the
   * game itself borrowed.
   */
  const credits = track(
    new Panel({
      title: t('credits.title'),
      subtitle: t('credits.subtitle'),
      variant: 'default',
      width: '100%',
      content: CREDITS.map((entry) =>
        h(
          'section',
          { class: 'omf-credits__entry', dataset: { credit: entry.id } },
          h('h3', { class: 'omf-credits__name fui-title', text: t(entry.titleKey) }),
          h('p', { class: 'omf-credits__body', text: t(entry.bodyKey) }),
          ...(entry.credit ? [h('p', { class: 'omf-credits__line', text: entry.credit })] : []),
          h(
            'dl',
            { class: 'omf-credits__meta' },
            h('dt', { text: t('credits.licence') }),
            h('dd', { text: entry.licence }),
            h('dt', { text: t('credits.source') }),
            h('dd', { text: entry.source }),
          ),
        ),
      ),
    }),
  );

  /**
   * The third upgrade (Q30).
   *
   * §15 said two and no more; the owner added this one in the fifth polish
   * round, and it belongs beside the other two rather than on a screen of its
   * own — it is bought with the same gold, from the same purse, for the same
   * account.
   */
  const bag = card(
    'backpack',
    t('upgrades.backpack'),
    t('upgrades.backpackDetail', { slots: account.backpackSlots, max: MAX_BACKPACK_SLOTS }),
    `${account.backpackSlots} / ${MAX_BACKPACK_SLOTS}`,
    backpackCost(account),
    nextBackpackSize(account) === null
      ? ''
      : t('upgrades.backpackNext', { slots: nextBackpackSize(account) ?? 0 }),
    t('upgrades.backpackMax'),
  );

  /**
   * Echoes of the Spire (Q36) — the permanent layer, above the gold upgrades.
   *
   * It sits on this screen rather than in a rail entry of its own because this
   * is already *the account's* screen: everything here is bought once and
   * survives every reset, which is exactly what an echo is. Above the three
   * gold upgrades because it is the one that never finishes.
   *
   * Six open nodes, no prerequisites. A lattice of locked branches would make
   * the first purchase the most important decision a player ever makes, at the
   * moment they know least about the game.
   */
  function buildEchoes(): HTMLElement {
    const tree = echoTree(account);
    const wrap = h('div', { class: 'omf-echoes', dataset: { testid: 'echoes' } });

    wrap.appendChild(
      h(
        'div',
        { class: 'omf-echoes__purse' },
        track(
          new StatChip({
            label: t('echo.held', { count: '' }).trim(),
            value: account.echoes,
            glyph: 'glyph-shooting-stars',
            tone: account.echoes > 0 ? 'gold' : 'neutral',
          }),
        ).el,
        h('span', {
          class: 'omf-echoes__earned',
          text: t('echo.earned', { count: account.echoesEarned }),
        }),
      ),
    );

    const cards = h('div', { class: 'omf-echoes__cards' });
    for (const node of tree) {
      const maxed = node.cost === null;
      const card = h('div', {
        class: 'omf-echoes__card',
        dataset: { testid: `echo-${node.def.id}`, maxed: String(maxed) },
      });

      card.appendChild(
        h('span', { class: 'omf-echoes__name fui-title', text: t(node.def.nameKey) }),
      );
      card.appendChild(
        h('span', {
          class: 'omf-echoes__rank',
          text: t('echo.rank', { rank: node.rank, max: ECHO_MAX_RANK }),
        }),
      );
      card.appendChild(h('p', { class: 'omf-echoes__desc', text: t(node.def.descKey) }));
      card.appendChild(
        h('p', {
          class: 'omf-echoes__now',
          text: t('echo.now', { value: describe(node.def.id, node.effect) }),
        }),
      );

      if (maxed) {
        card.appendChild(h('p', { class: 'omf-echoes__maxed', text: t('echo.maxed') }));
      } else {
        const buy = track(
          new Button({
            label: t('echo.buy'),
            size: 'sm',
            variant: node.affordable ? 'primary' : 'ghost',
            block: true,
            disabled: !node.affordable,
          }),
        );
        buy.on('click', () => onDeepen(node.def.id));
        setTip(buy.el, {
          title: t(node.def.nameKey),
          subtitle: t('echo.cost', { cost: node.cost ?? 0 }),
          stats: [
            {
              label: t('echo.now', { value: '' }).trim(),
              value: describe(node.def.id, node.effect),
            },
            {
              label: t('echo.next', { value: '' }).trim(),
              value: describe(node.def.id, node.effect + node.step),
              tone: 'good',
            },
          ],
          flavor: node.affordable
            ? t(node.def.descKey)
            : t('echo.short', { missing: (node.cost ?? 0) - account.echoes }),
        });
        card.appendChild(buy.el);
        if (!node.affordable) {
          // Said on the card, not only in the tooltip: a greyed button whose
          // reason is a hover away is a reason most players never read (§20.5).
          card.appendChild(
            h('p', {
              class: 'omf-echoes__short',
              text: t('echo.short', { missing: (node.cost ?? 0) - account.echoes }),
            }),
          );
        }
      }

      cards.appendChild(card);
    }

    wrap.appendChild(cards);
    return track(
      new Panel({
        title: t('echo.title'),
        subtitle: t('echo.subtitle'),
        variant: 'alt',
        width: '100%',
        content: [wrap],
      }),
    ).el;
  }

  /**
   * A node's worth, in the units that node is measured in.
   *
   * Coffers counts sockets and the rest are percentages, and printing "0.1
   * sockets" or "2%" for the wrong one is the sort of thing a player notices
   * immediately and never trusts again.
   */
  function describe(id: EchoNodeId, value: number): string {
    if (value <= 0) return t('echo.none');
    return id === 'coffers'
      ? t('echo.sockets', { count: Math.round(value) })
      : t('echo.percent', { percent: Math.round(value * 100) });
  }

  const el = h(
    'div',
    { class: 'omf-upgrades', dataset: { fuiTheme: 'stone-vine', testid: 'upgrades' } },
    track(new OrnateHeader({ title: t('upgrades.title'), subtitle: t('upgrades.subtitle') })).el,
    buildEchoes(),
    h('div', { class: 'omf-upgrades__cards' }, speed, slots, bag),
    h('div', { class: 'omf-credits', dataset: { testid: 'credits' } }, credits.el),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}

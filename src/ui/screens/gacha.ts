/**
 * The summoning lobby (Brief §16; UI_FANTASYUI_MAP §6).
 *
 * Two rites, side by side, each showing the three things a gacha screen owes the
 * player before they spend anything rare: what it costs, what they hold, and the
 * real odds. `RateTable` computes its own total from the rows it was given, so a
 * table that did not add up would say so on screen rather than be rounded quiet.
 *
 * The odds are not typed in here. They are derived from the same weights the
 * draw runs on (`bannerOdds`), which is the only way "honest rates" survives a
 * balance pass six months from now.
 *
 * Composed from parts rather than from FantasyUI's `BannerCarousel`/`SummonScreen`:
 * both are built for a unit-collection gacha with ten-pulls and a pity counter,
 * and Q20 gives us neither. Rendering a ×10 button we cannot honour would be a
 * shipped placeholder (§2.1). See UI_FANTASYUI_MAP §10, upstream wishes 9–10.
 */
import {
  CostButton,
  OrnateHeader,
  Panel,
  RateTable,
  SceneBackdrop,
  StatChip,
  h,
  type RateRow,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import { BANNERS, bannerOdds, type BannerConfig } from '@/content/balance/gacha.ts';
import { EQUIP_SLOT_IDS, type Character, type EquipSlotId } from '@/domain/character/types.ts';
import { availableSlots } from '@/domain/items/equip.ts';
import { canPull, currencyHeld, type BannerId } from '@/domain/gacha/gacha.ts';
import { setTip } from '@/ui/tooltips.ts';
import { currencyTooltip } from '@/ui/wallet.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface GachaScreenOptions {
  character: Character;
  /** Backpack size, since a full bag refuses a rite (Q16). */
  capacity: number;
  onPull: (banner: BannerId) => void;
  /** Aim gear prizes at one slot, or clear the wish (fifth polish round). */
  onWish: (slot: EquipSlotId | null) => void;
}

export interface GachaScreen {
  el: HTMLElement;
  destroy(): void;
}

export function createGachaScreen(options: GachaScreenOptions): GachaScreen {
  const { character, capacity, onPull, onWish } = options;
  const parts: FuiComponent[] = [];
  const track = <T extends FuiComponent>(component: T): T => {
    parts.push(component);
    return component;
  };

  /** One row per table entry, labelled by what it actually pays. */
  function rows(banner: BannerConfig): RateRow[] {
    return bannerOdds(banner.id).map(({ entry, chance }) => {
      const rate = chance * 100;
      if (entry.payout.kind === 'gear') {
        return {
          label: t('gacha.row.gear', { rarity: t(`rarity.${entry.payout.rarity}`) }),
          rate,
          rarity: entry.payout.rarity,
        };
      }
      return {
        label: entry.payout.kind === 'gold' ? t('gacha.row.gold') : t('gacha.row.materials'),
        rate,
      };
    });
  }

  function card(banner: BannerConfig): HTMLElement {
    const held = currencyHeld(character, banner.id);
    const refusal = canPull(character, banner.id, capacity);
    const currency = t(`currency.${banner.currency}`);

    const pull = track(
      new CostButton({
        label: t('gacha.pull'),
        cost: 1,
        currencyGlyph: banner.currencyGlyph,
        currency,
        balance: held,
        block: true,
        size: 'lg',
        // A full backpack is a refusal `CostButton` cannot express — it only
        // knows about price — so it is spelled out here rather than letting the
        // press through and failing afterwards (§20.5).
        disabled: refusal === 'backpackFull',
      }),
    );
    pull.on('cost:buy', () => onPull(banner.id));
    setTip(
      pull.el,
      refusal === 'backpackFull'
        ? t('gacha.refuse.backpackFull')
        : refusal === 'noCurrency'
          ? t('gacha.refuse.noCurrency', { currency })
          : t('gacha.held', { count: `${held} ${currency}` }),
    );

    const key = track(
      new SceneBackdrop({
        layers: [{ art: banner.art, fit: 'cover', opacity: 0.9 }],
        height: 190,
        scrim: 0.5,
        vignette: 0.55,
        fadeBottom: true,
        // The rite's name is already the panel's title; repeating it over the
        // art would cost a line of height and say nothing. What the key art
        // carries instead is the one number the player came here to check.
        content: h('div', { class: 'omf-gacha__key' }, ticketChip(track, banner, currency, held)),
      }),
    );

    const rates = track(
      new RateTable({
        title: t('gacha.rates.title'),
        rows: rows(banner),
        precision: 2,
      }),
    );

    return track(
      new Panel({
        title: t(banner.nameKey),
        variant: 'alt',
        width: '100%',
        height: '100%',
        scroll: true,
        content: [
          key.el,
          h('p', { class: 'omf-gacha__blurb', text: t(banner.blurbKey) }),
          pull.el,
          rates.el,
        ],
      }),
    ).el;
  }

  /**
   * The wish list (fifth polish round).
   *
   * It aims **which socket** a gear prize arrives in, and nothing else: not its
   * rarity, not its budget, not whether this pull pays gear at all. That is what
   * lets it sit directly under the rates table without making a liar of it —
   * every number printed there is about rarity, and a wish moves none of them.
   * It is deliberately pity-free: no counter, no guarantee, no escalating
   * promise. Aim, and the gear that comes lands where you are building.
   *
   * A socket the hero has not unlocked is shown and disabled with the tier that
   * opens it, rather than hidden (§20.5).
   */
  function buildWish(): HTMLElement {
    const unlocked = new Set(availableSlots(character.progression.ascension));
    const row = h('div', { class: 'omf-wish', dataset: { testid: 'wishlist' } });
    row.appendChild(h('h3', { class: 'omf-wish__title fui-title', text: t('gacha.wish.title') }));
    row.appendChild(h('p', { class: 'omf-wish__hint', text: t('gacha.wish.hint') }));

    const chips = h('div', { class: 'omf-wish__chips' });
    const chip = (
      slot: EquipSlotId | null,
      label: string,
      enabled: boolean,
      tip: string,
    ): HTMLElement => {
      const button = h('button', {
        class: 'omf-wish__chip',
        attrs: { type: 'button' },
        dataset: { testid: `wish-${slot ?? 'none'}` },
        text: label,
      });
      if (character.wishlist === slot) button.classList.add('is-on');
      if (!enabled) button.disabled = true;
      else button.addEventListener('click', () => onWish(slot));
      setTip(button, tip);
      return button;
    };

    chips.appendChild(
      chip(null, t('gacha.wish.none'), character.wishlist !== null, t('gacha.wish.noneTip')),
    );
    for (const slot of EQUIP_SLOT_IDS) {
      const open = unlocked.has(slot);
      const label = t(`slot.${slot}` as StringKey);
      chips.appendChild(
        chip(
          slot,
          label,
          open,
          open ? t('gacha.wish.tip', { slot: label }) : t('gacha.wish.locked', { slot: label }),
        ),
      );
    }

    row.appendChild(chips);
    return row;
  }

  const el = h(
    'div',
    {
      class: 'omf-gacha',
      dataset: { fuiTheme: 'stone-vine', testid: 'gacha' },
    },
    track(new OrnateHeader({ title: t('gacha.title'), subtitle: t('gacha.subtitle') })).el,
    h('div', { class: 'omf-gacha__rites' }, ...BANNERS.map(card)),
    buildWish(),
    // Said once, under both tables, rather than repeated on each card: these
    // three sentences are the disclosure, and printing them twice reads as
    // filler instead of as terms.
    h(
      'ul',
      { class: 'omf-gacha__terms' },
      ...[
        t('gacha.rates.note.always'),
        t('gacha.rates.note.perPull'),
        t('gacha.rates.note.bracket'),
      ].map((note) => h('li', { text: note })),
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

/**
 * The one number a player comes to this screen to check.
 *
 * The chip carries the full currency card rather than the bare label: a ticket
 * balance is worth nothing to somebody who does not know where tickets come
 * from, and this is the screen where they would most like to know (§20.4).
 */
function ticketChip(
  track: <T extends FuiComponent>(component: T) => T,
  banner: BannerConfig,
  currency: string,
  held: number,
): HTMLElement {
  const chip = track(
    new StatChip({ label: currency, value: held, glyph: banner.currencyGlyph, size: 'md' }),
  );
  setTip(chip.el, currencyTooltip(banner.currency, held));
  return chip.el;
}

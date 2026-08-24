/**
 * How an item looks, everywhere (UI_FANTASYUI_MAP §9).
 *
 * One of the four allowlisted custom pieces, and the least glamorous: it exists
 * so a sword looks and reads identically in the backpack, on the paperdoll, in a
 * shop row, in a loot window and in the gacha reveal. Without it, five screens
 * each invent their own rarity frame and their own idea of what an item's stats
 * are, and they drift apart within a milestone.
 *
 * It contributes no new visual language — rarity tinting, icons and tooltips are
 * FantasyUI's. What it standardises is the *mapping* from our data to theirs.
 */
import type { ItemCardData, SlotItem, TooltipOptions, TooltipStat } from '@/ui/fui/index.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { UNIQUE_MAGNITUDE } from '@/content/balance/uniques.ts';
import { UNIQUE_POWERS, type UniquePowerId } from '@/content/items/uniques.ts';
import { SET_SIZE, powerOf, setOf } from '@/domain/items/sets.ts';
import { itemStats } from '@/domain/items/derive.ts';
import { itemPower } from '@/domain/power/power.ts';
import { sellValue } from '@/domain/items/upgrade.ts';
import { GEAR_ASCENSION_MAX, GEAR_LEVEL_MAX, type ItemInstance } from '@/domain/items/types.ts';
import { STAT_IDS, type StatId } from '@/domain/stats.ts';
import { t, type StringKey } from '@/strings/index.ts';

/**
 * What swapping one piece for another would do.
 *
 * `newSlot` is the empty-socket case and is deliberately its own verdict rather
 * than a very large upgrade: "better by 31 power" is a comparison, and there is
 * nothing to compare against.
 */
export type SwapVerdict = 'upgrade' | 'downgrade' | 'sidegrade' | 'newSlot';

export interface StatSwap {
  stat: StatId;
  from: number;
  to: number;
}

export interface GearComparison {
  verdict: SwapVerdict;
  /** Signed change in Power Level if the swap happens. */
  powerDelta: number;
  /** Only the stats that actually move. */
  swaps: StatSwap[];
}

/**
 * The one answer to "is this better?", wherever it is asked.
 *
 * Every surface that shows a piece of gear needs the same verdict — the
 * tooltip, the marker on a bag slot, the shop row — and three surfaces each
 * deciding for themselves is three chances to disagree in front of the player.
 * Pass `null` for an empty socket.
 */
export function compareGear(candidate: ItemInstance, worn: ItemInstance | null): GearComparison {
  const next = itemStats(candidate);
  const current = worn ? itemStats(worn) : null;

  const swaps: StatSwap[] = [];
  for (const stat of STAT_IDS) {
    const to = next[stat];
    const from = current ? current[stat] : 0;
    if (to !== from) swaps.push({ stat, from, to });
  }

  const powerDelta = itemPower(candidate) - (worn ? itemPower(worn) : 0);
  const verdict: SwapVerdict = !worn
    ? 'newSlot'
    : powerDelta > 0
      ? 'upgrade'
      : powerDelta < 0
        ? 'downgrade'
        : 'sidegrade';

  return { verdict, powerDelta, swaps };
}

/** True when wearing this would raise the hero's Power Level. */
export function isUpgrade(comparison: GearComparison): boolean {
  return comparison.verdict === 'upgrade' || comparison.verdict === 'newSlot';
}

export function itemName(item: ItemInstance): string {
  return t(requireItemDef(item.defId).nameKey as StringKey);
}

/** The slot/paperdoll representation: art, rarity frame, and the uid to act on. */
export function itemSlot(item: ItemInstance): SlotItem {
  return {
    icon: requireItemDef(item.defId).icon,
    name: itemName(item),
    rarity: item.rarity,
    data: item.uid,
  };
}

/** The shop/loot row representation. */
export function itemCard(item: ItemInstance, price?: number): ItemCardData {
  const def = requireItemDef(item.defId);
  return {
    id: item.uid,
    icon: def.icon,
    name: itemName(item),
    type: t(`slot.${def.slot}` as StringKey),
    rarity: item.rarity,
    detail: statLine(item),
    ...(price === undefined ? {} : { price }),
  };
}

/** Every stat the piece gives, in the stat table's own order. */
export function itemStatRows(item: ItemInstance): TooltipStat[] {
  const stats = itemStats(item);
  return STAT_IDS.filter((stat) => stats[stat] > 0).map((stat) => ({
    label: t(`stat.${stat}` as StringKey),
    value: `+${stats[stat]}`,
    tone: 'good' as const,
  }));
}

/** The one-line summary a row shows without being hovered. */
export function statLine(item: ItemInstance): string {
  const rows = itemStatRows(item);
  const first = rows[0];
  if (!first) return t('loot.noStats');
  const extra = rows.length - 1;
  return extra > 0 ? `${first.value} ${first.label} +${extra}` : `${first.value} ${first.label}`;
}

export interface ItemTooltipOptions {
  /** Show what a merchant would pay for it. */
  showSellValue?: boolean;
  /** Marked as the piece currently worn in that slot. */
  worn?: boolean;
  /**
   * The piece already worn in this item's slot. When given, the card **leads**
   * with what changes if this one goes on instead — which is the question a
   * player hovering a drop is actually asking, and the one the first pass
   * answered last, under the piece's own stats, in deltas with no context. Pass
   * `null` for an empty socket; leave it out entirely when there is nothing to
   * compare against (a shop's sell list, the gacha reveal).
   */
  compareTo?: ItemInstance | null;
  /**
   * How many pieces of this item's set the hero already wears (Q45).
   *
   * Optional because most callers have no idea — a shop row is about a piece,
   * not about a hero — and the card degrades to naming the set rather than
   * inventing a count it cannot know.
   */
  wornOfSet?: number;
  /** Action line pinned to the bottom, e.g. "Click to inspect". */
  hint?: string;
}

/** The verdict line's words and colour, from a comparison. */
function verdictRow(comparison: GearComparison, slot: string): TooltipStat {
  const { verdict, powerDelta } = comparison;
  const signed = powerDelta > 0 ? `+${powerDelta}` : String(powerDelta);

  if (verdict === 'newSlot') {
    return {
      label: t('item.compare.empty'),
      value: t('item.compare.power', { delta: `+${powerDelta}` }),
      tone: 'good',
    };
  }
  if (verdict === 'sidegrade') {
    return { label: t('item.compare.sidegrade'), value: slot, tone: 'plain' };
  }
  return {
    label: t(verdict === 'upgrade' ? 'item.compare.upgrade' : 'item.compare.downgrade'),
    value: t('item.compare.power', { delta: signed }),
    tone: verdict === 'upgrade' ? 'good' : 'bad',
  };
}

/**
 * The full stat block, as the game's only tooltip (Brief §20.4).
 *
 * When there is something to compare against, the card is *about the swap*: the
 * verdict first, then each stat that moves written as `24 → 31` rather than as a
 * bare delta. Printing the piece's own stats as well would say every number
 * twice — the right-hand side of each arrow already is the piece's stat.
 */
export function itemTooltip(item: ItemInstance, options: ItemTooltipOptions = {}): TooltipOptions {
  const def = requireItemDef(item.defId);
  const slotLabel = t(`slot.${def.slot}` as StringKey);
  const requires: string[] = [];
  if (options.worn) requires.push(t('item.equipped'));

  // `compareTo` is absent when there is no socket in play at all; `null` means
  // the socket is there and empty, which is a comparison with a known answer.
  const comparing = options.compareTo !== undefined && !options.worn;
  const comparison = comparing ? compareGear(item, options.compareTo ?? null) : null;

  const stats: TooltipStat[] = [];

  if (comparison) {
    stats.push(verdictRow(comparison, slotLabel));
    for (const swap of comparison.swaps) {
      stats.push({
        label: t(`stat.${swap.stat}` as StringKey),
        value: t('item.compare.swap', { from: swap.from, to: swap.to }),
        tone: swap.to > swap.from ? 'good' : 'bad',
      });
    }
  } else {
    stats.push(...itemStatRows(item));
  }

  stats.push(
    { label: t('item.levelFull', { level: item.level, max: GEAR_LEVEL_MAX }), value: '' },
    { label: t('item.ascension', { stars: item.ascension, max: GEAR_ASCENSION_MAX }), value: '' },
  );

  /**
   * What makes this piece *this piece* (Q45).
   *
   * A unique's rule and a set's membership go under the numbers rather than
   * above them, because the numbers are what the swap comparison is about — but
   * they go in **bold as a stat row** rather than as flavour, because they are
   * the reason to keep a piece whose numbers lose.
   */
  const power = powerOf(item);
  if (power) {
    stats.push({
      label: t(UNIQUE_POWERS[power].nameKey),
      value: t('item.uniqueLine'),
      tone: 'good',
    });
  }

  const set = setOf(item);
  if (set) {
    stats.push({
      label: t(set.nameKey),
      value:
        options.wornOfSet === undefined
          ? t('set.title')
          : t('set.progress', { worn: options.wornOfSet, total: SET_SIZE }),
      tone: 'good',
    });
  }

  const flavour = power ? t(UNIQUE_POWERS[power].descKey, { percent: percentOf(power) }) : null;

  return {
    title: itemName(item),
    rarity: item.rarity,
    subtitle: t(`rarity.${item.rarity}` as StringKey),
    slotLabel,
    stats,
    ...(flavour ? { flavor: flavour } : {}),
    ...(requires.length > 0 ? { requires } : {}),
    ...(options.showSellValue ? { price: sellValue(item) } : {}),
    ...(options.hint ? { hint: options.hint } : {}),
  };
}

/** A unique's magnitude as a whole percentage, for the sentence that says it. */
function percentOf(power: UniquePowerId): number {
  return Math.round(UNIQUE_MAGNITUDE[power] * 100);
}

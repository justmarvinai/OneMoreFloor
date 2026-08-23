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
import { itemStats } from '@/domain/items/derive.ts';
import { sellValue } from '@/domain/items/upgrade.ts';
import { GEAR_ASCENSION_MAX, GEAR_LEVEL_MAX, type ItemInstance } from '@/domain/items/types.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import { t, type StringKey } from '@/strings/index.ts';

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
   * The piece already worn in this item's slot. When given, the card ends with
   * what changes if this one goes on instead — which is the question a player
   * hovering a drop is actually asking. Pass `null` for an empty slot; leave it
   * out entirely when there is nothing to compare against (a shop's sell list,
   * the gacha reveal).
   */
  compareTo?: ItemInstance | null;
  /** Action line pinned to the bottom, e.g. "Click to inspect". */
  hint?: string;
}

/** The full stat block, as the game's only tooltip (Brief §20.4). */
export function itemTooltip(item: ItemInstance, options: ItemTooltipOptions = {}): TooltipOptions {
  const def = requireItemDef(item.defId);
  const requires: string[] = [];
  if (options.worn) requires.push(t('item.equipped'));

  const stats: TooltipStat[] = [
    ...itemStatRows(item),
    { label: t('item.levelFull', { level: item.level, max: GEAR_LEVEL_MAX }), value: '' },
    { label: t('item.ascension', { stars: item.ascension, max: GEAR_ASCENSION_MAX }), value: '' },
  ];

  // Only worth printing against something. For an empty slot the stats above
  // already *are* the gain, and repeating them under a heading is noise.
  if (options.compareTo && !options.worn) {
    stats.push(...comparisonRows(item, options.compareTo));
  }

  return {
    title: itemName(item),
    rarity: item.rarity,
    subtitle: t(`rarity.${item.rarity}` as StringKey),
    slotLabel: t(`slot.${def.slot}` as StringKey),
    stats,
    ...(requires.length > 0 ? { requires } : {}),
    ...(options.showSellValue ? { price: sellValue(item) } : {}),
    ...(options.hint ? { hint: options.hint } : {}),
  };
}

/**
 * "If you wear this instead" — one row per stat that would move, signed and
 * coloured. Nothing is printed when the swap changes nothing, because a wall of
 * zeroes is worse than silence.
 */
function comparisonRows(item: ItemInstance, worn: ItemInstance): TooltipStat[] {
  const next = itemStats(item);
  const current = itemStats(worn);

  const rows: TooltipStat[] = [];
  for (const stat of STAT_IDS) {
    const delta = next[stat] - current[stat];
    if (delta === 0) continue;
    rows.push({
      label: t(`stat.${stat}` as StringKey),
      value: delta > 0 ? `+${delta}` : String(delta),
      tone: delta > 0 ? 'good' : 'bad',
    });
  }
  if (rows.length === 0) return [];

  return [{ label: t('item.vsEquipped'), value: '' }, ...rows];
}

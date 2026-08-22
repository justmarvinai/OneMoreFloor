/**
 * Rendering what a floor gave you (Brief §3.6, UI_FANTASYUI_MAP §9).
 *
 * One place turns a `FloorReward` into cards and chips, so a single floor's
 * result and a whole Quick-Raid's summary describe their loot in exactly the
 * same words — which is the honest way to show that skipping changes nothing but
 * the animation (Q8).
 */
import type { ItemCardData, ResultReward } from '@/ui/fui/index.ts';
import { itemStats } from '@/domain/items/derive.ts';
import type { ItemInstance } from '@/domain/items/types.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import type { FloorReward } from '@/domain/tower/rewards.ts';
import { getMaterial } from '@/content/items/materials.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** Item cards for a `LootWindow`, rarity-framed and summarised by what they give. */
export function lootCards(items: readonly ItemInstance[]): ItemCardData[] {
  return items.map((item) => {
    const def = requireItemDef(item.defId);
    return {
      id: item.uid,
      icon: def.icon,
      name: t(def.nameKey as StringKey),
      type: t(`slot.${def.slot}` as StringKey),
      rarity: item.rarity,
      detail: summarise(item),
    };
  });
}

/** The non-item spoils — materials and tickets — as `ResultScreen` chips. */
export function rewardChips(reward: FloorReward): ResultReward[] {
  const chips: ResultReward[] = [];

  for (const [id, count] of Object.entries(reward.materials)) {
    const material = getMaterial(id);
    if (!material || count <= 0) continue;
    chips.push({ icon: material.icon, label: t(material.nameKey as StringKey), qty: count });
  }
  if (reward.tickets > 0) {
    chips.push({ icon: 'icon-key', label: t('currency.tickets'), qty: reward.tickets });
  }
  if (reward.luckyTickets > 0) {
    chips.push({ icon: 'icon-star', label: t('currency.luckyTickets'), qty: reward.luckyTickets });
  }
  return chips;
}

/** The item's biggest contribution, in one line — the read a drop needs at a glance. */
function summarise(item: ItemInstance): string {
  const stats = itemStats(item);
  let best: { stat: (typeof STAT_IDS)[number]; value: number } | null = null;
  for (const stat of STAT_IDS) {
    const value = stats[stat];
    if (value > 0 && (!best || value > best.value)) best = { stat, value };
  }
  if (!best) return t('loot.noStats');
  return t('loot.stat', { value: best.value, stat: t(`stat.${best.stat}` as StringKey) });
}

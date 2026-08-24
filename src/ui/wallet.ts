/**
 * What the things in a player's purse and pack actually are.
 *
 * Gold, tickets and ascension materials show up on six different screens, and
 * each of them used to say the same thing about them: nothing, or a bare name
 * lifted from a component's `title` attribute. "Iron Sigil" is not an
 * explanation — a player holding three of something wants to know what it is
 * *for* and where more of it comes from (§20.4/§20.5).
 *
 * So both cards are built here and served everywhere, for the same reason
 * `itemView` exists: one answer, wherever the question is asked.
 */
import type { TooltipOptions } from '@/ui/fui/index.ts';
import { getMaterial, MATERIALS, MAX_MATERIAL_TIER } from '@/content/items/materials.ts';
import { bracketMinPower } from '@/domain/power/brackets.ts';
import { commas } from '@/ui/fui/index.ts';
import { t, type StringKey } from '@/strings/index.ts';

/** Every balance the game keeps. Materials are counted separately, by id. */
export type CurrencyId = 'gold' | 'tickets' | 'luckyTickets' | 'echoes';

/**
 * A currency's card: what it is, what it buys, where it comes from.
 *
 * Returned as a card rather than a sentence so the name can carry the display
 * face and the two explanations can sit under it as body copy.
 */
export function currencyTooltip(id: CurrencyId, held?: number): TooltipOptions {
  return {
    title: t(`currency.${id}.what` as StringKey),
    ...(held === undefined ? {} : { stats: [{ label: t('material.held'), value: commas(held) }] }),
    flavor: t(`currency.${id}.use` as StringKey),
    hint: t(`currency.${id}.where` as StringKey),
  };
}

/**
 * A material's card.
 *
 * "Where do I get this?" has one honest answer and it is not a floor number:
 * materials are tiered by *bracket*, so the depth that yields one is a function
 * of the hero's Power Level. The card states the power the tier starts at,
 * which is the number a player can actually check against their own.
 */
export function materialTooltip(id: string, held?: number): TooltipOptions {
  const material = getMaterial(id);
  if (!material) return { title: id };

  // Tiers advance one per five brackets (domain/power/brackets), so the tier's
  // first bracket is where it starts turning up.
  const power = bracketMinPower(material.tier * 5);

  return {
    title: t(material.nameKey as StringKey),
    subtitle: t('material.kind'),
    stats: [
      {
        label: t('material.tier'),
        value: t('material.tierValue', { tier: material.tier + 1, max: MAX_MATERIAL_TIER + 1 }),
      },
      ...(held === undefined ? [] : [{ label: t('material.held'), value: commas(held) }]),
    ],
    flavor: t('material.use'),
    hint: t('material.where', { power: commas(Math.round(power)) }),
  };
}

/** Ids of every material, for surfaces that list the whole set. */
export function allMaterialIds(): readonly string[] {
  return MATERIALS.map((material) => material.id);
}

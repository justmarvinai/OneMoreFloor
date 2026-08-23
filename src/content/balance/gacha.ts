/**
 * Gacha odds (Brief §16, shaped by Q20, BALANCE.md §8).
 *
 * Two numbers in here carry the brief's actual requirements. §16.2 says the
 * chance of Legendary or Mythical gear must be **extremely low** — so the
 * jackpots are low single digits and well under one percent respectively, and
 * the *animation* is what sells the near-miss (§16.3), not the table. And Q20
 * says **every pull pays something**, so no entry is empty and no weight is
 * spent on nothing: the worst outcome on the Ticket banner is a real bundle of
 * materials, and the worst on the Lucky banner is Epic gear.
 *
 * There is no pity counter in 0.1 (Q20). A pull is a pull.
 *
 * Weights are relative, not percentages — the lobby's rate table computes the
 * percentages from these, so the odds a player reads are the odds that ran.
 */
import type { StringKey } from '@/strings/index.ts';
import type { Rarity } from '@/domain/items/types.ts';

export type PullPayout =
  /** A piece of gear at the entry's rarity, generated in the player's bracket. */
  | { kind: 'gear'; rarity: Rarity }
  /** A bundle of the deepest materials this bracket yields. */
  | { kind: 'materials'; count: { min: number; max: number } }
  /** Gold, priced as a multiple of what a floor at this depth pays. */
  | { kind: 'gold'; floors: number };

export interface BannerEntry {
  id: string;
  weight: number;
  payout: PullPayout;
}

export interface BannerConfig {
  id: 'ticket' | 'lucky';
  nameKey: StringKey;
  blurbKey: StringKey;
  /** Which currency one pull costs. */
  currency: 'tickets' | 'luckyTickets';
  /** Masked glyph for the currency, on the pull button and the balance. */
  currencyGlyph: string;
  /** Painted key art behind the banner card and the summoning chamber. */
  art: string;
  /** Accent colour the whole rite is lit in, from FantasyUI's rarity ramp. */
  accent: string;
  /** The rarity the banner exists to chase, for the lobby's headline. */
  jackpot: Rarity;
  entries: readonly BannerEntry[];
}

/**
 * The Ticket banner. The jackpot is Legendary and it is deliberately rare; most
 * pulls pay gear a bracket-appropriate hero can actually use, or a bundle worth
 * having. The rest of the table exists to make the near-miss mean something.
 */
const TICKET_BANNER: BannerConfig = {
  id: 'ticket',
  nameKey: 'gacha.banner.ticket.name',
  blurbKey: 'gacha.banner.ticket.blurb',
  currency: 'tickets',
  currencyGlyph: 'glyph-shooting-stars',
  art: 'fire-arcane-ring',
  accent: '#ffa03c',
  jackpot: 'legendary',
  entries: [
    { id: 'gacha.ticket.legendary', weight: 3, payout: { kind: 'gear', rarity: 'legendary' } },
    { id: 'gacha.ticket.epic', weight: 14, payout: { kind: 'gear', rarity: 'epic' } },
    { id: 'gacha.ticket.rare', weight: 33, payout: { kind: 'gear', rarity: 'rare' } },
    {
      id: 'gacha.ticket.materials',
      weight: 30,
      payout: { kind: 'materials', count: { min: 3, max: 7 } },
    },
    { id: 'gacha.ticket.gold', weight: 20, payout: { kind: 'gold', floors: 26 } },
  ],
};

/**
 * The Lucky banner. Mythical is the point of it and is under one percent; the
 * floor of the table is Epic, so spending the rarest currency in the game can
 * never feel like a waste of it (BALANCE.md §8).
 */
const LUCKY_BANNER: BannerConfig = {
  id: 'lucky',
  nameKey: 'gacha.banner.lucky.name',
  blurbKey: 'gacha.banner.lucky.blurb',
  currency: 'luckyTickets',
  currencyGlyph: 'glyph-celestial-body',
  art: 'rune-astral-burst',
  accent: '#a97bff',
  jackpot: 'mythic',
  entries: [
    { id: 'gacha.lucky.mythic', weight: 8, payout: { kind: 'gear', rarity: 'mythic' } },
    { id: 'gacha.lucky.legendary', weight: 272, payout: { kind: 'gear', rarity: 'legendary' } },
    { id: 'gacha.lucky.epic', weight: 720, payout: { kind: 'gear', rarity: 'epic' } },
  ],
};

export const BANNERS: readonly BannerConfig[] = [TICKET_BANNER, LUCKY_BANNER];

/**
 * How high the summoning animation is allowed to *tease*, on the rarity ladder
 * (Brief §16.3: "fake-outs, rising tension").
 *
 * The rule that keeps this from being a lie: a bluff may over-sell, never
 * under-sell. The drawn rank is raised to the outcome's own rank before it is
 * used, so a Mythical always gets its full staging, while a bundle of ore can
 * still arrive behind a build that looked Legendary. The reveal is always the
 * truth; only the build bluffs — which is the whole reason a fake-out lands
 * instead of feeling cheated.
 *
 * Weights are relative. Most pulls stay honest; the long build is rare enough
 * that it still means something the twentieth time.
 */
export const BLUFF_LADDER: readonly { rank: number; weight: number }[] = [
  { rank: 0, weight: 34 },
  { rank: 2, weight: 26 },
  { rank: 3, weight: 22 },
  { rank: 4, weight: 14 },
  { rank: 5, weight: 4 },
];

export type BannerId = BannerConfig['id'];

export function bannerConfig(id: BannerId): BannerConfig {
  const banner = BANNERS.find((entry) => entry.id === id);
  if (!banner) throw new Error(`[gacha] unknown banner "${id}"`);
  return banner;
}

/** The odds a banner actually runs, as fractions — what the rate table prints. */
export function bannerOdds(id: BannerId): Array<{ entry: BannerEntry; chance: number }> {
  const banner = bannerConfig(id);
  const total = banner.entries.reduce((sum, entry) => sum + entry.weight, 0);
  return banner.entries.map((entry) => ({ entry, chance: entry.weight / total }));
}

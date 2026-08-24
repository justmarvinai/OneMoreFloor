/**
 * The deed board (Q40).
 *
 * Nine deeds, three tiers each, and every one of them counts something the game
 * was already counting.
 *
 * The first tiers are deliberately shallow — a handful of floors, a few purchases
 * — because a ledger whose first payout is hours away teaches a new player that
 * it is not for them. The third tiers are hundreds of hours, which is what makes
 * the middle one worth working towards. That is the design constraint and the reason the list is
 * short: a deed that needs its own bookkeeping is a deed that will drift out of
 * step with the thing it claims to measure.
 *
 * Seven track the quest board's own event stream — the same events that advance
 * a daily — and two are high-water marks read off the account itself. Nothing
 * here needs a counter that exists only for deeds.
 */
import type { StringKey } from '@/strings/index.ts';

/** What advances a deed. One flat union, so the domain has exactly one switch. */
export type DeedTrack =
  /** Floors cleared, boss floors included. */
  | 'floors'
  /** Boss floors alone. */
  | 'bosses'
  /** Gold banked, lifetime. */
  | 'goldEarned'
  /** Gold handed over, lifetime. */
  | 'goldSpent'
  /** Gear levels bought. */
  | 'gearUpgraded'
  /** Pieces bought from a counter. */
  | 'itemBought'
  /** Pieces sold or broken down. */
  | 'itemSold'
  /** Draughts drunk. */
  | 'potionDrunk'
  /** Deepest floor any hero on the account has cleared — a high-water mark. */
  | 'deepestFloor'
  /** Gates cleared in one Boss Rush — a high-water mark (Q39). */
  | 'bossRush';

export interface DeedDef {
  id: string;
  nameKey: StringKey;
  descriptionKey: StringKey;
  /** Line glyph, masked by the deed's row. */
  glyph: string;
  track: DeedTrack;
  /** Thresholds, ascending. Three of them: a deed is a ladder, not a switch. */
  tiers: readonly [number, number, number];
}

export const DEEDS: readonly DeedDef[] = [
  {
    id: 'deed.climber',
    nameKey: 'deed.climber',
    descriptionKey: 'deed.climber.desc',
    glyph: 'glyph-crossed-swords',
    track: 'floors',
    tiers: [10, 500, 5_000],
  },
  {
    id: 'deed.gatebreaker',
    nameKey: 'deed.gatebreaker',
    descriptionKey: 'deed.gatebreaker.desc',
    glyph: 'glyph-shield-block',
    track: 'bosses',
    tiers: [1, 50, 500],
  },
  {
    id: 'deed.deepest',
    nameKey: 'deed.deepest',
    descriptionKey: 'deed.deepest.desc',
    glyph: 'glyph-eagle-staff',
    track: 'deepestFloor',
    tiers: [10, 200, 1_000],
  },
  {
    id: 'deed.rush',
    nameKey: 'deed.rush',
    descriptionKey: 'deed.rush.desc',
    glyph: 'glyph-flaming-skull',
    track: 'bossRush',
    tiers: [3, 6, 10],
  },
  {
    id: 'deed.fortune',
    nameKey: 'deed.fortune',
    descriptionKey: 'deed.fortune.desc',
    glyph: 'glyph-trophy-cup',
    track: 'goldEarned',
    tiers: [10_000, 5_000_000, 500_000_000],
  },
  {
    id: 'deed.patron',
    nameKey: 'deed.patron',
    descriptionKey: 'deed.patron.desc',
    glyph: 'glyph-burning-scroll',
    track: 'goldSpent',
    tiers: [10_000, 5_000_000, 500_000_000],
  },
  {
    id: 'deed.smith',
    nameKey: 'deed.smith',
    descriptionKey: 'deed.smith.desc',
    glyph: 'glyph-hammer-hit',
    track: 'gearUpgraded',
    tiers: [10, 500, 5_000],
  },
  {
    id: 'deed.magpie',
    nameKey: 'deed.magpie',
    descriptionKey: 'deed.magpie.desc',
    glyph: 'glyph-spell-book',
    track: 'itemBought',
    tiers: [5, 250, 2_500],
  },
  {
    id: 'deed.apothecary',
    nameKey: 'deed.apothecary',
    descriptionKey: 'deed.apothecary.desc',
    glyph: 'glyph-health-potion',
    track: 'potionDrunk',
    tiers: [5, 250, 2_500],
  },
];

const BY_ID = new Map(DEEDS.map((def) => [def.id, def]));

export function getDeed(id: string): DeedDef | undefined {
  return BY_ID.get(id);
}

/** The key a claimed tier is recorded under: `<deed id>@<tier index>`. */
export function tierKey(id: string, tier: number): string {
  return `${id}@${tier}`;
}

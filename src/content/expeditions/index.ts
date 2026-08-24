/**
 * The expedition board (Q37).
 *
 * Six routes out of the Spire, from a two-hour errand on the lower landings to a
 * day-long descent nobody attempts before floor five hundred. They are content
 * (Brief §2.3): a seventh is a record here plus its strings, with no change to
 * game logic.
 *
 * Each route is described by four things:
 *
 *  - **How long it takes.** Short routes are for a lunch break, long ones for
 *    overnight, and the board should always hold one of each.
 *  - **What depth it needs.** A route gated behind a record the player has not
 *    reached says so rather than hiding, so the board reads as a ladder.
 *  - **What it favours.** Every route pays gold, experience and materials; the
 *    weights are what make one worth choosing over another at the same hour.
 *  - **Whether the party looks for tickets.** Only some do, and those pay less
 *    of everything else for it.
 */
import type { StringKey } from '@/strings/index.ts';

/** How a route divides its spoils. Weights, not amounts — the hour sets the size. */
export interface ExpeditionSpoils {
  gold: number;
  xp: number;
  materials: number;
  /** Multiplier on the chance of a summoning ticket. Zero means never. */
  tickets: number;
}

export interface ExpeditionDef {
  id: string;
  nameKey: StringKey;
  descriptionKey: StringKey;
  /** Line glyph, masked by the card. */
  glyph: string;
  /** Hours the party is away. */
  hours: number;
  /** Record floor the account must have reached before the route is offered. */
  minFloor: number;
  spoils: ExpeditionSpoils;
}

export const EXPEDITIONS: readonly ExpeditionDef[] = [
  {
    id: 'expedition.scavenge',
    nameKey: 'expedition.scavenge',
    descriptionKey: 'expedition.scavenge.desc',
    glyph: 'glyph-trophy-cup',
    hours: 2,
    // Open before a single floor has been cleared: the board is one of the
    // first things a new player sees, and a board with nothing on it teaches
    // them the feature is not for them.
    minFloor: 0,
    // The one everybody starts with: short, and mostly coin.
    spoils: { gold: 1.5, xp: 0.6, materials: 0.6, tickets: 0 },
  },
  {
    id: 'expedition.survey',
    nameKey: 'expedition.survey',
    descriptionKey: 'expedition.survey.desc',
    glyph: 'glyph-spell-book',
    hours: 4,
    minFloor: 10,
    // What the party learns is worth more than what they carry.
    spoils: { gold: 0.5, xp: 1.7, materials: 0.5, tickets: 0 },
  },
  {
    id: 'expedition.quarry',
    nameKey: 'expedition.quarry',
    descriptionKey: 'expedition.quarry.desc',
    glyph: 'glyph-hammer-hit',
    hours: 6,
    minFloor: 30,
    // The route to run when ascension is what you are short of.
    spoils: { gold: 0.4, xp: 0.4, materials: 2, tickets: 0 },
  },
  {
    id: 'expedition.pilgrimage',
    nameKey: 'expedition.pilgrimage',
    descriptionKey: 'expedition.pilgrimage.desc',
    glyph: 'glyph-shooting-stars',
    hours: 8,
    minFloor: 75,
    // Pays less of everything, and is the only way a wait finds a rite.
    spoils: { gold: 0.5, xp: 0.5, materials: 0.5, tickets: 1.6 },
  },
  {
    id: 'expedition.reclaim',
    nameKey: 'expedition.reclaim',
    descriptionKey: 'expedition.reclaim.desc',
    glyph: 'glyph-crossed-swords',
    hours: 12,
    minFloor: 200,
    // The balanced overnight: nothing to choose between its three lines.
    spoils: { gold: 1, xp: 1, materials: 1, tickets: 0.5 },
  },
  {
    id: 'expedition.descent',
    nameKey: 'expedition.descent',
    descriptionKey: 'expedition.descent.desc',
    glyph: 'glyph-flaming-skull',
    hours: 24,
    minFloor: 500,
    // A full day, and the deepest route the Spire will sell you.
    spoils: { gold: 1.3, xp: 1.3, materials: 1.3, tickets: 0.8 },
  },
];

const BY_ID = new Map(EXPEDITIONS.map((def) => [def.id, def]));

export function getExpedition(id: string): ExpeditionDef | undefined {
  return BY_ID.get(id);
}

/** Every route a record this deep has opened, shortest first. */
export function expeditionsFor(record: number): readonly ExpeditionDef[] {
  return EXPEDITIONS.filter((def) => def.minFloor <= record);
}

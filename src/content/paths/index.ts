/**
 * The routes a fork offers (Q41).
 *
 * Six ways through ten floors, and every one of them is a trade. There is no
 * route that is simply better than another: the Sheer Face pays for danger, the
 * Vaults pay coin for experience, the Quiet Way buys survival with everything
 * else. Which is right depends on what the hero is short of *this hour*, which
 * is the only thing that makes a fork worth reading.
 *
 * They are content (Brief §2.3): a seventh is a record in this file plus its
 * strings, with no change to game logic.
 */
import type { StringKey } from '@/strings/index.ts';

export interface PathDef {
  id: string;
  nameKey: StringKey;
  descriptionKey: StringKey;
  /** Line glyph, masked by the fork's card. */
  glyph: string;
  /** Multiplier on every enemy stat for the leg. One is the tower as authored. */
  danger: number;
  /** Multiplier on the gold a floor pays. */
  gold: number;
  /** Multiplier on the experience a floor teaches. */
  xp: number;
  /** Multiplier on the materials a floor gives up. */
  materials: number;
  /** Added to the chance a floor's enemy is an elite (Q44). */
  elites: number;
  /**
   * Always on the board. Exactly one route carries this: a fork whose every
   * branch is a gamble is not a choice, it is a tax.
   */
  always?: boolean;
}

export const PATHS: readonly PathDef[] = [
  {
    id: 'path.evenRoad',
    nameKey: 'path.evenRoad',
    descriptionKey: 'path.evenRoad.desc',
    glyph: 'glyph-crossed-swords',
    danger: 1,
    gold: 1,
    xp: 1,
    materials: 1,
    elites: 0,
    always: true,
  },
  {
    id: 'path.sheerFace',
    nameKey: 'path.sheerFace',
    descriptionKey: 'path.sheerFace.desc',
    glyph: 'glyph-rockets',
    // The straight trade, and the one most players will take once they are
    // comfortably ahead of the floor they are on.
    danger: 1.35,
    gold: 1.7,
    xp: 1.7,
    materials: 1.2,
    elites: 0,
  },
  {
    id: 'path.vaults',
    nameKey: 'path.vaults',
    descriptionKey: 'path.vaults.desc',
    glyph: 'glyph-trophy-cup',
    // Coin for experience: the route to walk when a piece of gear is one
    // upgrade away and the level is not the thing standing in the way.
    danger: 1.15,
    gold: 2.4,
    xp: 0.55,
    materials: 1,
    elites: 0,
  },
  {
    id: 'path.reliquary',
    nameKey: 'path.reliquary',
    descriptionKey: 'path.reliquary.desc',
    glyph: 'glyph-hammer-hit',
    // The ascension route. Pays in the one currency gold cannot buy.
    danger: 1.2,
    gold: 0.7,
    xp: 0.9,
    materials: 2.6,
    elites: 0,
  },
  {
    id: 'path.gauntlet',
    nameKey: 'path.gauntlet',
    descriptionKey: 'path.gauntlet.desc',
    glyph: 'glyph-flaming-skull',
    // Champions, most of the way up. Elites always pay gear (Q44), so this is
    // the route that turns a leg into a loot run without touching the bracket.
    danger: 1.1,
    gold: 1.15,
    xp: 1.15,
    materials: 1.15,
    elites: 0.5,
  },
  {
    id: 'path.quietWay',
    nameKey: 'path.quietWay',
    descriptionKey: 'path.quietWay.desc',
    glyph: 'glyph-peace-dove',
    // Less of everything, danger included. The wall-breaker: when the tower has
    // stopped moving, this is the leg that gets you past it.
    danger: 0.72,
    gold: 0.6,
    xp: 0.6,
    materials: 0.6,
    elites: 0,
  },
];

const BY_ID = new Map(PATHS.map((def) => [def.id, def]));

export function getPath(id: string): PathDef | undefined {
  return BY_ID.get(id);
}

/** The route that is always on the board, whatever else a fork rolls. */
export const PLAIN_PATH: PathDef = PATHS.find((def) => def.always === true)!;

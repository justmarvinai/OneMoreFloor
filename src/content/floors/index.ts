/**
 * Floor bands (Brief §3.1, CONTENT_PIPELINE §2).
 *
 * The tower is endless, so there are no per-floor tables — only bands that give
 * a stretch of floors its character, and a generator that keeps going past the
 * last authored one. The final band is deliberately open-ended: it is the one
 * the player spends most of their life in.
 *
 * A band's `families` list is load-bearing rather than descriptive: the floor
 * generator draws only from the families named here, so widening a band's cast
 * or narrowing it to make a stretch feel claustrophobic is a data edit
 * (CONTENT_PIPELINE §4). Bands overlap the enemies' own floor ranges — an enemy
 * appears where *both* agree — which is what lets a family fade in and out of a
 * stretch instead of switching on at its first floor.
 */
import type { EnemyFamily } from '@/content/enemies/types.ts';
import type { StringKey } from '@/strings/index.ts';

export interface FloorBand {
  id: string;
  nameKey: StringKey;
  /** First floor of the band; it runs until the next band begins. */
  from: number;
  /**
   * The only families that appear here. The generator filters its candidates by
   * this, so a band is a *place* rather than a caption over the same roster.
   */
  families: readonly EnemyFamily[];
  /**
   * Backdrop art id for fights in this band (Q11: FantasyUI art only in 0.1).
   * It is painted blurred and far back, so a band reads as a *place* rather than
   * a number — swapping it for the owner's own scene art is this one field.
   */
  backdrop: string;
}

export const FLOOR_BANDS: readonly FloorBand[] = [
  {
    id: 'band.undercroft',
    nameKey: 'band.undercroft',
    from: 1,
    families: ['vermin', 'brigand'],
    backdrop: 'earth-mossy-stone',
  },
  {
    id: 'band.brokenStair',
    nameKey: 'band.brokenStair',
    from: 15,
    families: ['brigand', 'beast', 'construct'],
    backdrop: 'earth-rock-spire',
  },
  {
    id: 'band.floodedWorks',
    nameKey: 'band.floodedWorks',
    from: 35,
    families: ['construct', 'arcane', 'vermin'],
    backdrop: 'earth-fissure-web',
  },
  {
    id: 'band.ossuary',
    nameKey: 'band.ossuary',
    from: 55,
    families: ['undead', 'beast', 'arcane'],
    backdrop: 'earth-monolith',
  },
  {
    id: 'band.emberReach',
    nameKey: 'band.emberReach',
    from: 75,
    families: ['infernal', 'undead', 'aberration', 'construct'],
    backdrop: 'fire-lava-field',
  },
  {
    id: 'band.endlessAscent',
    nameKey: 'band.endlessAscent',
    from: 101,
    families: ['aberration', 'infernal', 'arcane', 'construct', 'undead', 'beast'],
    backdrop: 'earth-crystal-meteor',
  },
];

export function bandForFloor(floor: number): FloorBand {
  let current = FLOOR_BANDS[0]!;
  for (const band of FLOOR_BANDS) {
    if (floor >= band.from) current = band;
  }
  return current;
}

/** Every tenth floor is a Boss Floor (Brief §3.1). */
export function isBossFloor(floor: number): boolean {
  return floor > 0 && floor % 10 === 0;
}

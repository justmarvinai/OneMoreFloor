/**
 * Floor bands (Brief §3.1, CONTENT_PIPELINE §2).
 *
 * The tower is endless, so there are no per-floor tables — only bands that give
 * a stretch of floors its character, and a generator that keeps going past the
 * last authored one. The final band is deliberately open-ended: it is the one
 * the player spends most of their life in.
 */
import type { EnemyFamily } from '@/content/enemies/types.ts';
import type { StringKey } from '@/strings/index.ts';

export interface FloorBand {
  id: string;
  nameKey: StringKey;
  /** First floor of the band; it runs until the next band begins. */
  from: number;
  /** Families that appear here, for flavour continuity within a stretch. */
  families: readonly EnemyFamily[];
}

export const FLOOR_BANDS: readonly FloorBand[] = [
  { id: 'band.undercroft', nameKey: 'band.undercroft', from: 1, families: ['vermin', 'brigand'] },
  {
    id: 'band.brokenStair',
    nameKey: 'band.brokenStair',
    from: 15,
    families: ['brigand', 'construct', 'beast'],
  },
  {
    id: 'band.ossuary',
    nameKey: 'band.ossuary',
    from: 35,
    families: ['undead', 'construct', 'beast'],
  },
  {
    id: 'band.emberReach',
    nameKey: 'band.emberReach',
    from: 60,
    families: ['infernal', 'undead'],
  },
  {
    id: 'band.endlessAscent',
    nameKey: 'band.endlessAscent',
    from: 101,
    families: ['infernal', 'undead', 'construct', 'beast'],
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

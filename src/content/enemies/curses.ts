/**
 * Curses — the enemy affix system, on the player's side (fifth polish round).
 *
 * The procedural modifiers next door are something the *tower* does to an enemy,
 * and they trade one stat for another so a deep floor is varied rather than
 * merely bigger. A curse is the mirror of that: something the *player* does to
 * every enemy, and it only ever raises, because the point is to choose a harder
 * tower and be paid for it.
 *
 * The list is content — which curses exist, what each is called, what it touches.
 * How much it raises and how much it pays are numbers, so they live in
 * `content/balance/enemies.ts` (§3.7), keyed off how many stats a curse names.
 */
import type { StatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

export interface CurseDef {
  id: string;
  nameKey: StringKey;
  descKey: StringKey;
  /** Glyph asset id for the chip. */
  glyph: string;
  /** Stats it raises on every enemy. Three or more makes it the broad curse. */
  raises: readonly StatId[];
}

export const CURSES: readonly CurseDef[] = [
  {
    id: 'curse.wrath',
    nameKey: 'curse.wrath',
    descKey: 'curse.wrath.desc',
    glyph: 'glyph-crossed-swords',
    raises: ['strength'],
  },
  {
    id: 'curse.bulwark',
    nameKey: 'curse.bulwark',
    descKey: 'curse.bulwark.desc',
    glyph: 'glyph-shield-block',
    raises: ['defense'],
  },
  {
    id: 'curse.vigour',
    nameKey: 'curse.vigour',
    descKey: 'curse.vigour.desc',
    glyph: 'glyph-ribcage-armor',
    raises: ['hp'],
  },
  {
    id: 'curse.swiftness',
    nameKey: 'curse.swiftness',
    descKey: 'curse.swiftness.desc',
    glyph: 'glyph-hourglass',
    raises: ['speed'],
  },
  {
    id: 'curse.cunning',
    nameKey: 'curse.cunning',
    descKey: 'curse.cunning.desc',
    glyph: 'glyph-cursed-eye',
    raises: ['luck'],
  },
  {
    id: 'curse.dominion',
    nameKey: 'curse.dominion',
    descKey: 'curse.dominion.desc',
    glyph: 'glyph-flaming-skull',
    raises: ['strength', 'defense', 'hp', 'speed', 'luck'],
  },
];

export function getCurse(id: string): CurseDef | undefined {
  return CURSES.find((curse) => curse.id === id);
}

/**
 * Credits — who made the things in this game that we did not (Brief §21).
 *
 * Kept as data rather than markup so the screen cannot drift from the licences.
 * `docs/CREDITS.md` is the same list for whoever is reading the repository;
 * this one is for the player, which is the audience CC BY actually asks for.
 *
 * Artist names, licence names and source domains are literals rather than string
 * keys on purpose. They are proper nouns and licence terms — the same in every
 * language the game is ever translated into, and not ours to reword (Q24).
 */
import type { StringKey } from '@/strings/index.ts';

export interface CreditEntry {
  id: string;
  /** What the thing is, in the player's language. */
  titleKey: StringKey;
  /** What it is used for. */
  bodyKey: StringKey;
  /** Licence name, verbatim. */
  licence: string;
  /** The attribution line the licence asks for, verbatim. */
  credit?: string;
  /** Where it came from, as text — never a link (see below). */
  source: string;
}

/**
 * The list, in the order the screen shows it: the library the whole game is
 * built out of first, then the art borrowed into it.
 *
 * `source` is printed as text, not linked. An anchor to an outside domain would
 * put an off-origin URL in the shipped bundle, which the §21 build assertion
 * refuses — and rightly: a game that promises to run with the network cable
 * pulled should not carry doorways out of itself.
 */
export const CREDITS: readonly CreditEntry[] = [
  {
    id: 'fantasyui',
    titleKey: 'credits.fantasyui.title',
    bodyKey: 'credits.fantasyui.body',
    licence: 'Owner’s own library',
    source: 'github.com/justmarvinai/fantasyuis',
  },
  {
    id: 'open-game-icons',
    titleKey: 'credits.icons.title',
    bodyKey: 'credits.icons.body',
    licence: 'CC BY 3.0',
    credit: 'Icons made by Lorc, Delapouite, Skoll and Willdabeast',
    source: 'open-game-icons.net',
  },
];

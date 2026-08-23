/**
 * The rite's choreography (Brief §16.3, UI_FANTASYUI_MAP §6).
 *
 * §16.3 is the one place the brief asks for a *feeling* and then says to budget
 * real time for it: "build anticipation… tease the player — fake-outs, rising
 * tension, escalating light/colour/particle language per rarity tier… feel like
 * a real event, not a UI transition."
 *
 * Same split that made combat's pacing testable in M4: this file decides *when*
 * the player sees each stage of the summoning and never touches the DOM. "A
 * Mythical gets a longer build than a bundle of ore", "the tease always dies
 * back at least once before the reveal", "a skipped rite still lands on the
 * truth" are then assertions about a list, not about pixels.
 *
 * The build is driven by `PullResult.bluff`, which the domain rolled and stored
 * — so the animation replays from a save exactly like the pull does, and the
 * bluff can never under-sell the outcome (see `BLUFF_LADDER`).
 */
import type { PullResult } from '@/domain/gacha/gacha.ts';
import { rarityIndex, type Rarity } from '@/domain/items/types.ts';
import type { StringKey } from '@/strings/index.ts';

/**
 * Presentation timing in milliseconds. Pacing, not balance: these change how a
 * summoning *reads*, never what it gave (§3.5's rule, applied to §16).
 */
export const RITE_TIMING = {
  /** The chamber darkens and the circle appears before anything moves. */
  open: 380,
  /** The circle waking — the first light. */
  charge: 900,
  /** A flare swelling toward a rarity. */
  teaseUp: 540,
  /** …and dying back. This is the fake-out. */
  teaseDown: 420,
  /** The last climb, with no way back down. */
  surge: 700,
  /** The instant it holds — the flash. */
  breakOpen: 300,
  /** The prize landing on the plinth. */
  reveal: 620,
  /** Long enough to read what you got before the buttons matter. */
  settle: 460,
} as const;

/**
 * How the build escalates per bluff rank, indexed by the rank itself.
 *
 * `cycles` is how many times the light swells and dies back before the real
 * one; `peak` is how lit the circle gets at the top of the build. A rank of 0
 * is the honest short build — one swell and the answer.
 */
const BUILD: readonly { cycles: number; peak: number }[] = [
  { cycles: 1, peak: 0.45 },
  { cycles: 1, peak: 0.52 },
  { cycles: 2, peak: 0.64 },
  { cycles: 2, peak: 0.78 },
  { cycles: 3, peak: 0.9 },
  { cycles: 3, peak: 1 },
];

export type RiteBeat =
  /** The chamber. Nothing has happened yet, and that is the point. */
  | { kind: 'open'; at: number; duration: number; charge: number }
  | { kind: 'charge'; at: number; duration: number; charge: number; captionKey: StringKey }
  /** Light swells toward a rarity it may or may not be telling the truth about. */
  | {
      kind: 'tease';
      at: number;
      duration: number;
      charge: number;
      rank: number;
      captionKey: StringKey;
    }
  /** It dies back. The fake-out (§16.3). */
  | { kind: 'fade'; at: number; duration: number; charge: number }
  /** The circle holds — flash, shake, and no more doubt. */
  | { kind: 'break'; at: number; duration: number; rank: number; captionKey: StringKey }
  | {
      kind: 'reveal';
      at: number;
      duration: number;
      /** Null when the prize is gold or materials rather than gear. */
      rarity: Rarity | null;
      rank: number;
      captionKey: StringKey;
    }
  | { kind: 'settle'; at: number; duration: number };

/** The rank the *outcome* actually is, which the bluff may never fall below. */
export function outcomeRank(result: PullResult): number {
  return result.rarity ? rarityIndex(result.rarity) : 0;
}

/** What the circle says when it finally answers. */
export function revealCaption(result: PullResult): StringKey {
  if (result.rarity) {
    switch (result.rarity) {
      case 'legendary':
        return 'gacha.rite.reveal.legendary';
      case 'mythic':
        return 'gacha.rite.reveal.mythic';
      case 'epic':
        return 'gacha.rite.reveal.epic';
      case 'rare':
        return 'gacha.rite.reveal.rare';
      default:
        return 'gacha.rite.reveal.common';
    }
  }
  return result.reward.gold > 0 ? 'gacha.rite.reveal.gold' : 'gacha.rite.reveal.materials';
}

/**
 * Turn one resolved pull into the ordered beats that perform it.
 *
 * Pure, and total: every bluff rank has a build, so a rank that arrives from a
 * future table cannot produce a rite with no beats in it.
 */
export function riteBeats(result: PullResult): RiteBeat[] {
  const bluff = clampRank(result.bluff);
  const build = BUILD[bluff] ?? BUILD[0]!;
  const beats: RiteBeat[] = [];
  let at = 0;

  const push = (beat: RiteBeat): void => {
    beats.push(beat);
    at += beat.duration;
  };

  push({ kind: 'open', at, duration: RITE_TIMING.open, charge: 0 });
  push({
    kind: 'charge',
    at,
    duration: RITE_TIMING.charge,
    charge: 0.3,
    captionKey: 'gacha.rite.charge',
  });

  // Each cycle climbs a little higher than the last and falls back, so the
  // player is *repeatedly* almost-there. The final climb has no fade after it.
  for (let cycle = 0; cycle < build.cycles; cycle += 1) {
    const isLast = cycle === build.cycles - 1;
    const height = build.peak * ((cycle + 1) / build.cycles);
    push({
      kind: 'tease',
      at,
      duration: isLast ? RITE_TIMING.surge : RITE_TIMING.teaseUp,
      charge: height,
      rank: rankAt(height, bluff),
      captionKey: isLast ? 'gacha.rite.almost' : 'gacha.rite.tease',
    });
    if (!isLast) {
      // Never all the way back to dark: each fall-back leaves the circle hotter
      // than the last, which is what reads as *rising* tension rather than a
      // loop.
      push({ kind: 'fade', at, duration: RITE_TIMING.teaseDown, charge: height * 0.45 });
    }
  }

  push({
    kind: 'break',
    at,
    duration: RITE_TIMING.breakOpen,
    rank: bluff,
    captionKey: 'gacha.rite.break',
  });
  push({
    kind: 'reveal',
    at,
    duration: RITE_TIMING.reveal,
    rarity: result.rarity,
    rank: outcomeRank(result),
    captionKey: revealCaption(result),
  });
  push({ kind: 'settle', at, duration: RITE_TIMING.settle });

  return beats;
}

/** How long the whole rite runs, for tests and for the skip affordance. */
export function riteDurationMs(beats: readonly RiteBeat[]): number {
  return beats.reduce((total, beat) => total + beat.duration, 0);
}

function clampRank(rank: number): number {
  if (!Number.isFinite(rank)) return 0;
  return Math.max(0, Math.min(BUILD.length - 1, Math.round(rank)));
}

/** The rarity the light is currently *pretending* to be, from how lit it is. */
function rankAt(height: number, bluff: number): number {
  return Math.max(0, Math.min(bluff, Math.round(height * bluff)));
}

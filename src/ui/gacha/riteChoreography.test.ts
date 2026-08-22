import { describe, expect, it } from 'vitest';
import type { PullResult } from '@/domain/gacha/gacha.ts';
import type { ItemInstance, Rarity } from '@/domain/items/types.ts';
import { RITE_TIMING, riteBeats, riteDurationMs, revealCaption } from './riteChoreography.ts';

const EMPTY = { gold: 0, xp: 0, materials: {}, items: [], tickets: 0, luckyTickets: 0 };

function pullOf(overrides: Partial<PullResult> = {}): PullResult {
  return {
    banner: 'ticket',
    entryId: 'gacha.ticket.rare',
    rarity: 'rare',
    item: { uid: 'x', rarity: 'rare' } as ItemInstance,
    reward: EMPTY,
    bluff: 0,
    ...overrides,
  };
}

describe('the rite’s choreography (Brief §16.3)', () => {
  it('always builds before it reveals — never a cut', () => {
    const beats = riteBeats(pullOf());
    const kinds = beats.map((beat) => beat.kind);

    expect(kinds[0]).toBe('open');
    expect(kinds).toContain('charge');
    expect(kinds).toContain('tease');
    expect(kinds.indexOf('reveal')).toBeGreaterThan(kinds.indexOf('charge'));
    expect(kinds.at(-1)).toBe('settle');
  });

  it('gives a Mythical a longer build than a bundle of ore', () => {
    // §16.3's escalation, stated as a property rather than as a hope.
    const ore = riteDurationMs(riteBeats(pullOf({ rarity: null, item: null, bluff: 0 })));
    const mythic = riteDurationMs(riteBeats(pullOf({ rarity: 'mythic', bluff: 5 })));
    expect(mythic).toBeGreaterThan(ore * 1.5);
  });

  it('rises monotonically with the bluff rank', () => {
    let previous = 0;
    for (const bluff of [0, 2, 3, 4, 5]) {
      const length = riteDurationMs(riteBeats(pullOf({ bluff })));
      expect(length).toBeGreaterThanOrEqual(previous);
      previous = length;
    }
  });

  it('dies back at least once on any bluff worth the name (the fake-out)', () => {
    for (const bluff of [2, 3, 4, 5]) {
      const fades = riteBeats(pullOf({ bluff })).filter((beat) => beat.kind === 'fade');
      expect(fades.length, `bluff ${bluff}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('leaves the circle hotter after every fall-back — rising tension, not a loop', () => {
    const beats = riteBeats(pullOf({ bluff: 5 }));
    const fades = beats.filter((beat) => beat.kind === 'fade');
    for (let index = 1; index < fades.length; index += 1) {
      expect(fades[index]!.charge).toBeGreaterThan(fades[index - 1]!.charge);
    }
    // And the final climb never falls back again.
    const lastFade = beats.map((beat) => beat.kind).lastIndexOf('fade');
    const lastTease = beats.map((beat) => beat.kind).lastIndexOf('tease');
    expect(lastTease).toBeGreaterThan(lastFade);
  });

  it('ends its build at full charge, whatever the outcome turns out to be', () => {
    for (const bluff of [0, 2, 3, 4, 5]) {
      const teases = riteBeats(pullOf({ bluff })).filter((beat) => beat.kind === 'tease');
      const peak = Math.max(...teases.map((beat) => ('charge' in beat ? beat.charge : 0)));
      expect(peak, `bluff ${bluff}`).toBeGreaterThan(0.4);
    }
  });

  it('never lets the bluff undersell the prize', () => {
    // A Legendary staged like a common would be the one unforgivable version of
    // this feature. The domain guarantees it; this proves the beats honour it.
    const beats = riteBeats(pullOf({ rarity: 'legendary', bluff: 4 }));
    const reveal = beats.find((beat) => beat.kind === 'reveal');
    expect(reveal && 'rank' in reveal ? reveal.rank : -1).toBe(4);
  });

  it('reveals the truth even when the build was bluffing', () => {
    const beats = riteBeats(
      pullOf({ rarity: null, item: null, reward: { ...EMPTY, gold: 900 }, bluff: 5 }),
    );
    const reveal = beats.find((beat) => beat.kind === 'reveal');
    expect(reveal && 'rarity' in reveal ? reveal.rarity : 'unset').toBeNull();
    expect(reveal && 'captionKey' in reveal ? reveal.captionKey : '').toBe(
      'gacha.rite.reveal.gold',
    );
  });

  it('names every outcome it can produce', () => {
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    for (const rarity of rarities) {
      expect(revealCaption(pullOf({ rarity }))).toMatch(/^gacha\.rite\.reveal\./);
    }
    expect(revealCaption(pullOf({ rarity: null, item: null }))).toBe('gacha.rite.reveal.materials');
  });

  it('survives a bluff rank no table has produced yet', () => {
    // Totality: a future banner adding a rank must not yield a rite with no
    // beats in it, which would show the player a black screen.
    for (const bluff of [-3, 1, 9, Number.NaN]) {
      const beats = riteBeats(pullOf({ bluff }));
      expect(beats.length, `bluff ${bluff}`).toBeGreaterThan(3);
      expect(riteDurationMs(beats)).toBeGreaterThan(RITE_TIMING.open);
    }
  });

  it('stays a set-piece rather than a transition', () => {
    // The brief's own words: "feel like a real event, not a UI transition."
    // A rite that ran in a third of a second would not be one.
    const shortest = riteDurationMs(riteBeats(pullOf({ bluff: 0 })));
    expect(shortest).toBeGreaterThan(2_000);
  });
});

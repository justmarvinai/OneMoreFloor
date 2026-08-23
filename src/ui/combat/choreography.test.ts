/**
 * The pacing of a fight, asserted as data (COMBAT.md §7).
 *
 * The choreographer is a pure function, which is what makes questions like "does
 * a signature get its pause?" and "are damage numbers still legible at x8?"
 * testable at all — none of them need a browser.
 */
import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/domain/character/character.ts';
import { fightFloor, heroCombatant } from '@/domain/tower/run.ts';
import { enemyCombatant, generateFloor } from '@/domain/tower/floors.ts';
import { resolveCombat } from '@/domain/combat/resolve.ts';
import type { CombatScript, EffectDef } from '@/domain/combat/types.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import { choreograph, floatLifeFor, performanceMs, TIMING } from './choreography.ts';
import { iconForEffect } from './effectIcons.ts';

/**
 * A fixed instant. Nothing here drinks potions, and pinning the clock is what
 * keeps these fights byte-identical between runs (ARCHITECTURE §5).
 */
const NOW = 1_700_000_000_000;

function character(classId: 'warrior' | 'mage' | 'swashbuckler' = 'warrior') {
  return createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId,
    createdAt: 0,
    runSeed: 'choreography-test',
  });
}

/** A real fight, resolved by the real engine — never a hand-written script. */
function script(floor = 1): CombatScript {
  const hero = character();
  const generated = generateFloor(hero.tower.runSeed, floor);
  return resolveCombat({
    hero: heroCombatant(hero, NOW),
    enemy: enemyCombatant(generated),
    floor,
    isBoss: generated.isBoss,
    floorEffects: generated.effects,
    seed: `choreography:${floor}`,
  });
}

describe('choreograph', () => {
  it('gives every event in the script a beat', () => {
    const fight = script();
    // The floor's own effects are folded into the opening event, so a fight that
    // applies them produces more beats than it has events, never fewer.
    expect(choreograph(fight).length).toBeGreaterThanOrEqual(fight.events.length);
  });

  it('never schedules a beat before the one in front of it', () => {
    for (const floor of [1, 7, 10, 40]) {
      const beats = choreograph(script(floor));
      for (let index = 1; index < beats.length; index += 1) {
        expect(beats[index]!.at, `floor ${floor}, beat ${index}`).toBeGreaterThanOrEqual(
          beats[index - 1]!.at,
        );
      }
    }
  });

  it('opens on the fight and closes on its end', () => {
    const beats = choreograph(script());
    expect(beats[0]!.step.kind).toBe('start');
    expect(beats[beats.length - 1]!.step.kind).toBe('end');
  });

  it('holds longer on a signature than on an ordinary strike (COMBAT.md §5)', () => {
    expect(TIMING.signatureWindUp).toBeGreaterThan(TIMING.windUp * 2);
  });

  it('holds longer on a crit than on a graze', () => {
    expect(TIMING.afterCrit).toBeGreaterThan(TIMING.afterHit);
  });

  it('marks a hit heavy only when it takes a real bite out of the target', () => {
    const beats = choreograph(script(1));
    const hits = beats.flatMap((beat) => (beat.step.kind === 'hit' ? [beat.step] : []));
    expect(hits.length).toBeGreaterThan(0);
    // Nothing on floor 1 should take 15% of the hero's health in one blow; the
    // flag exists for the fights where it does.
    for (const hit of hits) {
      if (hit.target === 'hero') expect(hit.heavy).toBe(false);
    }
  });

  it('plays the whole fight faster as the rate rises, and only that (§3.5)', () => {
    const beats = choreograph(script());
    const atX1 = performanceMs(beats, 1);
    expect(performanceMs(beats, 2)).toBeCloseTo(atX1 / 2, 5);
    expect(performanceMs(beats, 8)).toBeCloseTo(atX1 / 8, 5);
  });

  it('resolves the same script into the same schedule every time', () => {
    expect(choreograph(script(4))).toEqual(choreograph(script(4)));
  });
});

describe('damage numbers', () => {
  it('shortens with the playback rate', () => {
    expect(floatLifeFor(false, 2)).toBeLessThan(floatLifeFor(false, 1));
  });

  it('never falls below the legibility floor, even at x8 (COMBAT.md §7)', () => {
    for (const rate of [1, 2, 4, 8]) {
      expect(floatLifeFor(false, rate)).toBeGreaterThanOrEqual(TIMING.minFloatLife);
      expect(floatLifeFor(true, rate)).toBeGreaterThanOrEqual(TIMING.minFloatLife);
    }
  });

  it('keeps crits on screen at least as long as ordinary hits', () => {
    for (const rate of [1, 2, 4, 8]) {
      expect(floatLifeFor(true, rate)).toBeGreaterThanOrEqual(floatLifeFor(false, rate));
    }
  });
});

describe('effect icons', () => {
  const effect = (over: Partial<EffectDef>): EffectDef => ({
    id: 'effect.test',
    nameKey: 'effect.chill',
    kind: 'statScale',
    magnitude: 0.1,
    duration: 3,
    tone: 'buff',
    ...over,
  });

  it('gives every stat its own painted icon', () => {
    const icons = STAT_IDS.map((stat) => iconForEffect(effect({ stat })));
    expect(new Set(icons).size).toBe(STAT_IDS.length);
  });

  it('never binds a line glyph, which a chip paints as an invisible black', () => {
    const all = [
      ...STAT_IDS.map((stat) => iconForEffect(effect({ stat }))),
      iconForEffect(effect({ kind: 'damageReduction' })),
      iconForEffect(effect({ kind: 'dodgeNext' })),
      iconForEffect(effect({ kind: 'statScale' })),
    ];
    for (const icon of all) expect(icon.startsWith('glyph-'), icon).toBe(false);
  });
});

describe('a fight the player watches and one they skip', () => {
  it('are the same fight — the schedule is the only difference (Q8)', () => {
    const hero = character();
    const watched = fightFloor(hero, 1, NOW);
    const skipped = fightFloor(hero, 1, NOW);
    expect(watched.script).toEqual(skipped.script);
    expect(choreograph(watched.script)).toEqual(choreograph(skipped.script));
  });
});

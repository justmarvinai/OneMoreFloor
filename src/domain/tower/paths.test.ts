import { describe, expect, it } from 'vitest';
import { FLOORS_PER_LEG, PATHS_OFFERED } from '@/content/balance/paths.ts';
import { PATHS, PLAIN_PATH } from '@/content/paths/index.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { generateFloor } from './floors.ts';
import { applyDeath } from './run.ts';
import {
  choosePath,
  clearPaths,
  forkFor,
  legOf,
  legRange,
  needsChoice,
  pathElites,
  pathFor,
  pathSpoils,
  pathStats,
} from './paths.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'path-test',
    }),
    ...overrides,
  };
}

/** Take the named road at `floor`, failing loudly if the fork refuses. */
function take(character: Character, floor: number, id: string): Character {
  const result = choosePath(character, floor, id);
  if (typeof result === 'string') throw new Error(`${id} refused: ${result}`);
  return result;
}

describe('the shape of a fork (Q41)', () => {
  it('cuts the climb at the tower’s own gates', () => {
    expect(legOf(1)).toBe(0);
    expect(legOf(FLOORS_PER_LEG)).toBe(0);
    expect(legOf(FLOORS_PER_LEG + 1)).toBe(1);
    expect(legRange(0)).toEqual([1, FLOORS_PER_LEG]);
    expect(legRange(3)).toEqual([31, 40]);
  });

  it('offers three roads, one of which is always the plain way', () => {
    for (let leg = 0; leg < 40; leg += 1) {
      const fork = forkFor('seed', leg);
      expect(fork).toHaveLength(PATHS_OFFERED);
      expect(fork[0]).toBe(PLAIN_PATH);
      expect(new Set(fork.map((def) => def.id)).size).toBe(PATHS_OFFERED);
    }
  });

  it('offers the same fork every time a run reaches it', () => {
    // A road not taken has to have really been there, or a replay is a lie.
    expect(forkFor('seed', 7)).toEqual(forkFor('seed', 7));
    // And a different run forks differently somewhere in its first forty legs.
    const same = Array.from({ length: 40 }, (_, leg) =>
      forkFor('other', leg).every((def, index) => def === forkFor('seed', leg)[index]),
    );
    expect(same.every(Boolean)).toBe(false);
  });

  it('never offers a road the game does not define', () => {
    for (let leg = 0; leg < 40; leg += 1) {
      for (const def of forkFor('seed', leg)) expect(PATHS).toContain(def);
    }
  });
});

describe('taking a road (Q41)', () => {
  it('starts every leg at a fork', () => {
    expect(needsChoice(hero(), 1)).toBe(true);
    expect(pathFor(hero(), 1)).toBeNull();
  });

  it('holds for the whole leg, and only that leg', () => {
    const walked = take(hero(), 1, PLAIN_PATH.id);

    expect(pathFor(walked, 1)?.id).toBe(PLAIN_PATH.id);
    expect(pathFor(walked, FLOORS_PER_LEG)?.id).toBe(PLAIN_PATH.id);
    // The next gate forks again.
    expect(needsChoice(walked, FLOORS_PER_LEG + 1)).toBe(true);
  });

  it('refuses in words rather than in silence', () => {
    const fresh = hero();
    expect(choosePath(fresh, 1, 'path.nonesuch')).toBe('noSuchPath');

    // A real road that this fork did not offer.
    const offered = new Set(forkFor(fresh.tower.runSeed, 0).map((def) => def.id));
    const elsewhere = PATHS.find((def) => !offered.has(def.id))!;
    expect(choosePath(fresh, 1, elsewhere.id)).toBe('notOffered');

    // And no changing your mind once the leg is under way.
    expect(choosePath(take(fresh, 1, PLAIN_PATH.id), 1, PLAIN_PATH.id)).toBe('alreadyChosen');
  });

  it('is forgotten when the run ends, because the run chose it', () => {
    const walked = take(hero(), 1, PLAIN_PATH.id);
    expect(applyDeath(walked).tower.pathChoices).toEqual({});
    expect(clearPaths(walked).tower.pathChoices).toEqual({});
  });

  it('ignores a road a future build removed rather than fielding a ghost', () => {
    const tampered = hero({
      tower: { ...hero().tower, pathChoices: { '0': 'path.nonesuch' } },
    });
    expect(pathFor(tampered, 1)).toBeNull();
  });
});

describe('what a road changes (Q41)', () => {
  const stats = { strength: 100, defense: 80, hp: 900, resource: 40, luck: 30, speed: 20 };

  it('changes nothing at all on the plain way', () => {
    expect(pathStats(stats, PLAIN_PATH)).toEqual(stats);
    expect(pathSpoils(PLAIN_PATH)).toEqual({ gold: 1, xp: 1, materials: 1 });
    expect(pathElites(PLAIN_PATH)).toBe(0);
  });

  it('is neutral for a leg with no road chosen', () => {
    expect(pathStats(stats, null)).toEqual(stats);
    expect(pathSpoils(null)).toEqual({ gold: 1, xp: 1, materials: 1 });
    expect(pathElites(null)).toBe(0);
  });

  it('scales every enemy stat together, so the fight keeps its shape', () => {
    const hard = PATHS.find((def) => def.danger > 1)!;
    const scaled = pathStats(stats, hard);

    for (const stat of Object.keys(stats) as Array<keyof typeof stats>) {
      expect(scaled[stat]).toBe(Math.max(1, Math.round(stats[stat] * hard.danger)));
    }
  });

  it('makes every road a trade rather than an upgrade', () => {
    // Nothing on the board raises everything at once: a road that did would be
    // the only road anybody ever took.
    for (const def of PATHS) {
      if (def.id === PLAIN_PATH.id) continue;
      // Safety counts as a gain: the Quiet Way's whole offer is less danger,
      // and it pays for that in everything else.
      const better =
        def.danger < 1 || def.gold > 1 || def.xp > 1 || def.materials > 1 || def.elites > 0;
      const worse = def.danger > 1 || def.gold < 1 || def.xp < 1 || def.materials < 1;
      expect(better && worse, `${def.id} costs nothing`).toBe(true);
    }
  });

  it('never changes the roll, only the numbers', () => {
    // A floor on the Sheer Face is the same enemy the plain way would have met.
    const hard = PATHS.find((def) => def.danger > 1 && def.elites === 0)!;
    const plain = generateFloor('seed', 7, [], PLAIN_PATH);
    const steep = generateFloor('seed', 7, [], hard);

    expect(steep.enemy.id).toBe(plain.enemy.id);
    expect(steep.modifier).toEqual(plain.modifier);
    expect(steep.isElite).toBe(plain.isElite);
    expect(steep.stats.strength).toBeGreaterThan(plain.stats.strength);
  });

  it('turns the Gauntlet into a run of champions', () => {
    const gauntlet = PATHS.find((def) => def.elites > 0)!;
    let plain = 0;
    let claimed = 0;

    for (let floor = 11; floor <= 90; floor += 1) {
      if (generateFloor('elites', floor, [], PLAIN_PATH).isElite) plain += 1;
      if (generateFloor('elites', floor, [], gauntlet).isElite) claimed += 1;
    }
    expect(claimed).toBeGreaterThan(plain);
  });

  it('never lets a road touch the bracket (Brief §13)', () => {
    // The whole guarantee: a road changes what a floor *pays*, never the window
    // the gear it pays comes out of.
    for (const def of PATHS) {
      const floor = generateFloor('bracket', 24, [], def);
      expect(floor.floor).toBe(24);
      expect(floor.band).toEqual(generateFloor('bracket', 24, [], PLAIN_PATH).band);
    }
  });
});

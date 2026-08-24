import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { BOSSES, ENEMIES } from '@/content/enemies/index.ts';
import { createCharacter } from '../character/character.ts';
import type { Character } from '../character/types.ts';
import { bracketAt } from '../power/brackets.ts';
import { enemyCombatant, generateFloor, isBossFloor } from './floors.ts';
import { rarityWeightsFor, rollFloorReward, rollItem } from './rewards.ts';
import {
  applyClear,
  applyDeath,
  bracketForCharacter,
  canQuickRaid,
  fightFloor,
  quickRaid,
} from './run.ts';

/**
 * A fixed instant. Nothing here drinks potions, and pinning the clock is what
 * keeps these fights byte-identical between runs (ARCHITECTURE §5).
 */
const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: 0,
    runSeed: 'tower-test',
  });
  return { ...base, ...overrides };
}

describe('floor structure (Brief §3.1)', () => {
  it('makes every tenth floor a boss floor, and no others', () => {
    for (let floor = 1; floor <= 200; floor += 1) {
      expect(isBossFloor(floor), `floor ${floor}`).toBe(floor % 10 === 0);
    }
  });

  it('generates the same floor for the same run and number', () => {
    expect(generateFloor('run:a', 17)).toEqual(generateFloor('run:a', 17));
  });

  it('generates different towers for different runs', () => {
    const a = Array.from({ length: 12 }, (_, i) => generateFloor('run:a', i + 1).enemy.id);
    const b = Array.from({ length: 12 }, (_, i) => generateFloor('run:b', i + 1).enemy.id);
    expect(a).not.toEqual(b);
  });

  it('scales endlessly and monotonically (Brief §3.7)', () => {
    let previous = 0;
    for (const floor of [1, 10, 50, 100, 500, 1_000, 5_000]) {
      const generated = generateFloor('scaling', floor);
      expect(Number.isFinite(generated.stats.hp), `floor ${floor}`).toBe(true);
      expect(generated.stats.hp, `floor ${floor}`).toBeGreaterThan(previous);
      previous = generated.stats.hp;
    }
  });

  it('never produces a broken floor anywhere in a long sweep', () => {
    for (let floor = 1; floor <= 5_000; floor += 37) {
      const generated = generateFloor('sweep', floor);
      expect(generated.enemy, `floor ${floor}`).toBeDefined();
      for (const value of Object.values(generated.stats)) {
        expect(Number.isFinite(value) && value >= 1, `floor ${floor}`).toBe(true);
      }
    }
  });

  it('makes a boss floor harder than its neighbours (Brief §3.2)', () => {
    const before = generateFloor('boss-check', 19);
    const boss = generateFloor('boss-check', 20);
    expect(boss.isBoss).toBe(true);
    expect(boss.stats.hp).toBeGreaterThan(before.stats.hp * 1.5);
  });

  it('gives bosses a kit that debuffs the player and buffs the boss (§3.2)', () => {
    const boss = generateFloor('boss-kit', 20);
    expect(boss.effects.some((entry) => entry.unit === 'hero')).toBe(true);
    expect(boss.effects.some((entry) => entry.unit === 'enemy')).toBe(true);
  });

  it('keeps normal-floor debuffs noticeably weaker than boss debuffs (§3.2)', () => {
    const normalWorst = Math.max(
      ...ENEMIES.filter((enemy) => enemy.playerDebuff).map((enemy) =>
        Math.abs(enemy.playerDebuff!.magnitude),
      ),
    );
    const bossMildest = Math.min(
      ...BOSSES.filter((boss) => boss.playerDebuff).map((boss) =>
        Math.abs(boss.playerDebuff!.magnitude),
      ),
    );
    expect(normalWorst).toBeLessThan(bossMildest);
  });

  it('applies modifiers past the authored floors, so deep enemies still vary', () => {
    const modifiers = new Set<string>();
    for (let floor = 120; floor < 200; floor += 1) {
      const generated = generateFloor('modifiers', floor);
      if (generated.modifier) modifiers.add(generated.modifier.id);
    }
    expect(modifiers.size).toBeGreaterThan(1);
  });

  it('never modifies a boss', () => {
    for (const floor of [10, 20, 50, 100, 500]) {
      expect(generateFloor('boss-mod', floor).modifier).toBeNull();
    }
  });

  it('turns a generated floor into a fightable enemy', () => {
    const combatant = enemyCombatant(generateFloor('combatant', 10));
    expect(combatant.hp).toBe(combatant.maxHp);
    expect(combatant.signature).toBe('bossOnslaught');
    expect(enemyCombatant(generateFloor('combatant', 9)).signature).toBeNull();
  });
});

describe('rewards (Brief §3.6)', () => {
  const input = {
    floor: 12,
    isBoss: false,
    bracket: bracketAt(3),
    classId: 'warrior',
    ascension: 0 as const,
    rng: createRng('reward'),
  };

  it('always pays gold and experience', () => {
    const reward = rollFloorReward({ ...input, rng: createRng('r1') });
    expect(reward.gold).toBeGreaterThan(0);
    expect(reward.xp).toBeGreaterThan(0);
  });

  it('pays more on a boss floor (§3.2)', () => {
    const normal = rollFloorReward({ ...input, rng: createRng('same') });
    const boss = rollFloorReward({ ...input, isBoss: true, rng: createRng('same') });
    expect(boss.gold).toBeGreaterThan(normal.gold);
    expect(boss.items.length).toBeGreaterThanOrEqual(normal.items.length);
  });

  it('pays more the deeper the floor', () => {
    const shallow = rollFloorReward({ ...input, floor: 5, rng: createRng('depth') });
    const deep = rollFloorReward({ ...input, floor: 90, rng: createRng('depth') });
    expect(deep.gold).toBeGreaterThan(shallow.gold * 5);
  });

  it('keeps Legendary out of the early game and Mythical vanishingly rare (§9.2)', () => {
    const early = Object.fromEntries(
      rarityWeightsFor(0).map((entry) => [entry.value, entry.weight]),
    );
    expect(early.legendary).toBe(0);
    expect(early.mythic).toBeLessThan(0.1);

    const late = Object.fromEntries(
      rarityWeightsFor(30).map((entry) => [entry.value, entry.weight]),
    );
    expect(late.legendary).toBeGreaterThan(0);
    // Mythical stays an event at every depth, never a schedule.
    expect(late.mythic).toBeLessThan(1);
  });

  it('never drops a relic or artifact before its slot is unlocked (Q22)', () => {
    for (let seed = 0; seed < 400; seed += 1) {
      const item = rollItem({
        ...input,
        bracket: bracketAt(20),
        ascension: 0,
        rng: createRng(`gated:${seed}`),
      });
      if (!item) continue;
      expect(item.defId).not.toContain('.relic.');
      expect(item.defId).not.toContain('.artifact.');
    }
  });

  it('offers them once the hero has ascended far enough', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 600; seed += 1) {
      const item = rollItem({
        ...input,
        bracket: bracketAt(20),
        ascension: 5,
        rng: createRng(`ungated:${seed}`),
      });
      if (item) seen.add(item.defId.split('.')[1]!);
    }
    expect(seen.has('relic') || seen.has('artifact')).toBe(true);
  });

  it('never drops another class’s weapon (Brief §8.2)', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const item = rollItem({ ...input, classId: 'mage', rng: createRng(`class:${seed}`) });
      if (!item) continue;
      expect(item.defId).not.toContain('warrior-');
      expect(item.defId).not.toContain('hunter-');
    }
  });
});

describe('climbing and death (Brief §3.3)', () => {
  it('banks rewards and advances the run on a clear', () => {
    const before = hero();
    const result = fightFloor(before, 1, NOW);

    expect(result.cleared).toBe(true);
    expect(result.character.currencies.gold).toBeGreaterThan(before.currencies.gold);
    expect(result.character.tower.currentRunFloor).toBe(2);
    expect(result.character.tower.highestFloorEverCleared).toBe(1);
  });

  it('destroys nothing owned when the hero dies — only the run resets', () => {
    // A deep floor against a level-1 hero is a certain loss.
    const rich = applyClear(
      { ...hero(), tower: { ...hero().tower, currentRunFloor: 60 } },
      59,
      {
        gold: 5_000,
        xp: 400,
        materials: { 'mat.spire-dust': 12 },
        items: [],
        tickets: 2,
        luckyTickets: 1,
      },
      NOW,
    ).character;

    const result = fightFloor(rich, 60, NOW);
    expect(result.cleared).toBe(false);

    const after = result.character;
    expect(after.currencies).toEqual(rich.currencies);
    expect(after.materials).toEqual(rich.materials);
    expect(after.inventory).toEqual(rich.inventory);
    expect(after.equipment).toEqual(rich.equipment);
    expect(after.progression).toEqual(rich.progression);
    // Only the run resets (§3.3), and the record survives (§3.4).
    expect(after.tower.currentRunFloor).toBe(1);
    expect(after.tower.highestFloorEverCleared).toBe(rich.tower.highestFloorEverCleared);
  });

  it('keeps the highest-floor record when a later run falls short (§3.4)', () => {
    const veteran = {
      ...hero(),
      tower: { ...hero().tower, currentRunFloor: 3, highestFloorEverCleared: 41 },
    };
    const cleared = applyClear(
      veteran,
      3,
      {
        gold: 1,
        xp: 1,
        materials: {},
        items: [],
        tickets: 0,
        luckyTickets: 0,
      },
      NOW,
    ).character;
    expect(cleared.tower.highestFloorEverCleared).toBe(41);
  });

  it('resets only the run floor and the tower itself on death', () => {
    const before = { ...hero(), tower: { ...hero().tower, currentRunFloor: 34 } };
    const after = applyDeath(before);
    expect(after.tower.currentRunFloor).toBe(1);
    // Nothing outside `tower` is touched (§3.3).
    expect({ ...after, tower: before.tower }).toEqual(before);
  });

  it('gives the next run a fresh tower rather than a replay of the fatal one', () => {
    const before = hero();
    const after = applyDeath(before);

    expect(after.tower.runSeed).not.toBe(before.tower.runSeed);
    // The floors a player already knows are not the floors they meet again.
    const oldFloors = Array.from(
      { length: 8 },
      (_, i) => generateFloor(before.tower.runSeed, i + 1).enemy.id,
    );
    const newFloors = Array.from(
      { length: 8 },
      (_, i) => generateFloor(after.tower.runSeed, i + 1).enemy.id,
    );
    expect(newFloors).not.toEqual(oldFloors);
  });

  it('derives the new seed deterministically, so a save replays identically', () => {
    expect(applyDeath(hero()).tower.runSeed).toBe(applyDeath(hero()).tower.runSeed);
  });

  it('keeps floors stable within a run, which is what stability is for', () => {
    const character = hero();
    const first = generateFloor(character.tower.runSeed, 12);
    const again = generateFloor(character.tower.runSeed, 12);
    expect(again).toEqual(first);
  });
});

describe('Quick-Raid (Brief §3.4, Q8)', () => {
  const veteran = (): Character => ({
    ...hero(),
    tower: { ...hero().tower, currentRunFloor: 1, highestFloorEverCleared: 6 },
  });

  it('may only skip floors already cleared', () => {
    const character = veteran();
    expect(canQuickRaid(character, 6)).toBe(true);
    expect(canQuickRaid(character, 7)).toBe(false);
  });

  it('gives a skipped floor exactly the rewards a watched one would', () => {
    // The heart of Q8: skipping skips the animation, not the outcome.
    const character = veteran();
    const watched = fightFloor(character, 1, NOW);
    const raided = quickRaid(character, 1, NOW);

    expect(raided.floors[0]!.script).toEqual(watched.script);
    expect(raided.reward).toEqual(watched.reward);
    expect(raided.character).toEqual(watched.character);
  });

  it('chains through every cleared floor and stops at the ceiling', () => {
    const result = quickRaid(veteran(), 20, NOW);
    expect(result.reachedFloor).toBe(6);
    expect(result.floors).toHaveLength(6);
    expect(result.died).toBe(false);
    expect(result.character.tower.currentRunFloor).toBe(7);
  });

  it('aggregates the whole raid into one summary', () => {
    const result = quickRaid(veteran(), 6, NOW);
    const summed = result.floors.reduce((total, floor) => total + (floor.reward?.gold ?? 0), 0);
    expect(result.reward.gold).toBe(summed);
  });

  it('stops the moment the hero would die, rather than pretending they survived', () => {
    // Cleared to floor 80 long ago, but nothing has been upgraded since.
    const overreaching: Character = {
      ...hero(),
      tower: { ...hero().tower, currentRunFloor: 1, highestFloorEverCleared: 80 },
    };
    const result = quickRaid(overreaching, 80, NOW);

    expect(result.died).toBe(true);
    expect(result.character.tower.currentRunFloor).toBe(1);
    expect(result.reachedFloor).toBeLessThan(80);
  });
});

describe('brackets follow the character', () => {
  it('rises as the hero gets stronger', () => {
    const fresh = bracketForCharacter(hero());
    const veteran = bracketForCharacter({
      ...hero(),
      progression: { level: 90, xp: 0, ascension: 3 },
      tower: { ...hero().tower, highestFloorEverCleared: 300 },
    });
    expect(veteran.index).toBeGreaterThan(fresh.index);
  });
});

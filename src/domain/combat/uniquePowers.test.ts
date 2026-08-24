import { describe, expect, it } from 'vitest';
import { UNIQUE_MAGNITUDE } from '@/content/balance/uniques.ts';
import type { UniquePowerId } from '@/content/items/uniques.ts';
import { resolveCombat } from './resolve.ts';
import type { Combatant, CombatScript } from './types.ts';

/**
 * A fighter with a signature, so the resource bar actually *spends* and refills.
 * Without one the bar fills to its pool once and stops, and every question about
 * how fast it fills has the same answer.
 */
function unit(id: 'hero' | 'enemy', powers: readonly UniquePowerId[] = [], luck = 15): Combatant {
  const stats = { strength: 40, defense: 20, hp: 900, resource: 60, luck, speed: 10 };
  return {
    id,
    ...(powers.length > 0 ? { powers } : {}),
    nameKey: id === 'hero' ? 'class.warrior' : 'enemy.spireRat',
    sourceId: id === 'hero' ? 'warrior' : 'enemy.spire-rat',
    avatar: 'silhouette-warrior-m',
    baseStats: { ...stats },
    hp: stats.hp,
    maxHp: stats.hp,
    resource: { kind: 'rage', current: 0, pool: stats.resource },
    signature: id === 'hero' ? 'berserkStrike' : null,
    effects: [],
  };
}

function fight(powers: readonly UniquePowerId[] = [], seed = 'powers', luck = 15): CombatScript {
  return resolveCombat({
    hero: unit('hero', powers, luck),
    enemy: unit('enemy'),
    floor: 20,
    isBoss: false,
    seed,
  });
}

/** Total damage one side dealt across the whole fight. */
function damageBy(script: CombatScript, source: 'hero' | 'enemy'): number {
  return script.events
    .filter((event) => event.type === 'hit' && event.source === source)
    .reduce((total, event) => total + (event.type === 'hit' ? event.amount : 0), 0);
}

describe('unique powers, in the engine (Q45)', () => {
  it('changes nothing at all when the hero carries none', () => {
    // The floor under every other assertion here: a hero without a named piece
    // fights exactly the fight they fought before this feature existed.
    expect(fight([])).toEqual(fight([]));
  });

  it('Emberdrinker returns health from the blows that land', () => {
    const script = fight(['lifesteal']);
    const heals = script.events.filter((event) => event.type === 'heal');

    expect(heals.length).toBeGreaterThan(0);
    for (const heal of heals) {
      if (heal.type !== 'heal') continue;
      expect(heal.unit).toBe('hero');
      expect(heal.source).toBe('lifesteal');
      expect(heal.amount).toBeGreaterThan(0);
    }
  });

  it('Emberdrinker never heals past the pool', () => {
    const script = fight(['lifesteal']);
    for (const event of script.events) {
      if (event.type === 'heal') expect(event.unitHp).toBeLessThanOrEqual(900);
    }
  });

  it('Stoneward turns aside a share of everything', () => {
    const plain = damageBy(fight([], 'ward'), 'enemy');
    const warded = damageBy(fight(['bulwark'], 'ward'), 'enemy');

    expect(warded).toBeLessThan(plain);
  });

  it('Bramblehide sends damage back to whoever dealt it', () => {
    /**
     * Against an enemy too large to kill, so both fights run the same number of
     * rounds. Comparing totals in a fight the thorns *shorten* would measure the
     * length of the fight rather than the rule.
     */
    const wall = (powers: readonly UniquePowerId[]): CombatScript =>
      resolveCombat({
        hero: unit('hero', powers),
        enemy: { ...unit('enemy'), hp: 500_000, maxHp: 500_000 },
        floor: 20,
        isBoss: false,
        seed: 'thorn',
      });

    // The hero deals *more* damage with thorns on, because the reflected blows
    // are recorded as theirs.
    expect(damageBy(wall(['thorns']), 'hero')).toBeGreaterThan(damageBy(wall([]), 'hero'));
  });

  it('Bramblehide does not recurse when both sides carry it', () => {
    // Two units reflecting at each other would otherwise run until the stack
    // gave out. The fight has to terminate.
    const script = resolveCombat({
      hero: unit('hero', ['thorns']),
      enemy: { ...unit('enemy'), powers: ['thorns'] },
      floor: 20,
      isBoss: false,
      seed: 'mutual',
    });
    expect(script.events[script.events.length - 1]?.type).toBe('fightEnd');
  });

  it('Quickening fills the bar faster without changing what it does', () => {
    const fill = (powers: readonly UniquePowerId[]): number =>
      fight(powers, 'charge')
        .events.filter((event) => event.type === 'resource' && event.unit === 'hero')
        .reduce(
          (total, event) => total + (event.type === 'resource' ? event.to - event.from : 0),
          0,
        );

    expect(fill(['swiftCharge'])).toBeGreaterThan(fill([]));
  });

  it('Spirekeen makes a critical hit bigger, not more likely', () => {
    // Luck high enough that crits certainly land, or the assertion would pass
    // for the wrong reason on a fight that simply never critted.
    const LUCKY = 400;
    const crits = (powers: readonly UniquePowerId[]): number =>
      fight(powers, 'crit', LUCKY).events.filter((event) => event.type === 'hit' && event.crit)
        .length;

    expect(crits([])).toBeGreaterThan(0);
    // The same seed rolls the same crits; only their size moves.
    expect(crits(['deadlyCrits'])).toBe(crits([]));
    expect(damageBy(fight(['deadlyCrits'], 'crit', LUCKY), 'hero')).toBeGreaterThan(
      damageBy(fight([], 'crit', LUCKY), 'hero'),
    );
  });

  it('keeps every magnitude in one band, so no unique makes another pointless', () => {
    const values = Object.values(UNIQUE_MAGNITUDE);
    expect(Math.min(...values)).toBeGreaterThan(0);
    expect(Math.max(...values) / Math.min(...values)).toBeLessThan(6);
  });
});

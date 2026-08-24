import { describe, expect, it } from 'vitest';
import { TALENT_MAGNITUDE } from '@/content/balance/talents.ts';
import { resolveCombat } from './resolve.ts';
import type { CombatTalents, Combatant, CombatScript } from './types.ts';

const NONE: CombatTalents = {
  signature: 0,
  resourceFill: 0,
  critDamage: 0,
  damageReduction: 0,
  regeneration: 0,
};

/**
 * A fighter with a signature, so the resource bar actually spends and refills —
 * without one, every question about how fast it fills has the same answer.
 */
function unit(id: 'hero' | 'enemy', talents: Partial<CombatTalents> = {}, luck = 15): Combatant {
  const stats = { strength: 40, defense: 20, hp: 900, resource: 60, luck, speed: 10 };
  return {
    id,
    talents: { ...NONE, ...talents },
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

function fight(talents: Partial<CombatTalents> = {}, seed = 'talents', luck = 15): CombatScript {
  return resolveCombat({
    hero: unit('hero', talents, luck),
    enemy: unit('enemy'),
    floor: 20,
    isBoss: false,
    seed,
  });
}

function damageBy(script: CombatScript, source: 'hero' | 'enemy'): number {
  return script.events
    .filter((event) => event.type === 'hit' && event.source === source)
    .reduce((total, event) => total + (event.type === 'hit' ? event.amount : 0), 0);
}

describe('talents, in the engine (Q38)', () => {
  it('changes nothing at all when the hero has spent no points', () => {
    // The floor under every other assertion here: an untalented hero fights
    // exactly the fight they fought before this feature existed.
    const bare: Combatant = { ...unit('hero'), talents: undefined };
    const neutral = unit('hero');
    const run = (hero: Combatant): CombatScript =>
      resolveCombat({ hero, enemy: unit('enemy'), floor: 20, isBoss: false, seed: 'flat' });

    expect(run(bare)).toEqual(run(neutral));
  });

  it('fills the bar faster without changing what it buys', () => {
    const filled = (talents: Partial<CombatTalents>): number =>
      fight(talents, 'charge')
        .events.filter((event) => event.type === 'resource' && event.unit === 'hero')
        .reduce(
          (total, event) => total + (event.type === 'resource' ? event.to - event.from : 0),
          0,
        );

    expect(filled({ resourceFill: 0.5 })).toBeGreaterThan(filled({}));
  });

  it('makes the signature hit harder without making it happen more often', () => {
    const signatures = (talents: Partial<CombatTalents>): number =>
      fight(talents, 'sig').events.filter(
        (event) => event.type === 'action' && event.kind === 'signature',
      ).length;

    // The same seed spends the bar at the same moments; only the blow is bigger.
    expect(signatures({ signature: 0.6 })).toBe(signatures({}));
    expect(damageBy(fight({ signature: 0.6 }, 'sig'), 'hero')).toBeGreaterThan(
      damageBy(fight({}, 'sig'), 'hero'),
    );
  });

  it('makes a critical hit bigger, not more likely', () => {
    const LUCKY = 400;
    const crits = (talents: Partial<CombatTalents>): number =>
      fight(talents, 'crit', LUCKY).events.filter((event) => event.type === 'hit' && event.crit)
        .length;

    expect(crits({})).toBeGreaterThan(0);
    expect(crits({ critDamage: 0.5 })).toBe(crits({}));
    expect(damageBy(fight({ critDamage: 0.5 }, 'crit', LUCKY), 'hero')).toBeGreaterThan(
      damageBy(fight({}, 'crit', LUCKY), 'hero'),
    );
  });

  it('turns a share of every blow aside', () => {
    expect(damageBy(fight({ damageReduction: 0.3 }, 'ward'), 'enemy')).toBeLessThan(
      damageBy(fight({}, 'ward'), 'enemy'),
    );
  });

  it('heals between exchanges, and names the tree that paid', () => {
    const heals = fight({ regeneration: TALENT_MAGNITUDE.regeneration * 5 }, 'regen').events.filter(
      (event) => event.type === 'heal',
    );

    expect(heals.length).toBeGreaterThan(0);
    for (const heal of heals) {
      if (heal.type !== 'heal') continue;
      expect(heal.unit).toBe('hero');
      expect(heal.source).toBe('regeneration');
      expect(heal.unitHp).toBeLessThanOrEqual(900);
    }
  });

  it('never lets regeneration undo the blow that killed the hero', () => {
    // It fires at the end of a round, after both sides have acted, so a hero at
    // nought stays at nought and the fight ends.
    const script = resolveCombat({
      hero: { ...unit('hero', { regeneration: 0.5 }), hp: 1 },
      enemy: { ...unit('enemy'), baseStats: { ...unit('enemy').baseStats, strength: 100_000 } },
      floor: 20,
      isBoss: false,
      seed: 'lethal',
    });

    expect(script.outcome.heroSurvived).toBe(false);
    expect(script.events[script.events.length - 1]?.type).toBe('fightEnd');
  });
});

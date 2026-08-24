import { describe, expect, it } from 'vitest';
import { resolveCombat, type ResolvePet } from './resolve.ts';
import type { Combatant, CombatScript, EffectDef } from './types.ts';

const AURA: EffectDef = {
  id: 'aura:test',
  nameKey: 'pet.emberling.aura',
  kind: 'statScale',
  stat: 'strength',
  magnitude: 0.2,
  duration: 'wholeFight',
  tone: 'buff',
};

function unit(id: 'hero' | 'pet' | 'enemy', overrides: Partial<Combatant> = {}): Combatant {
  const stats = { strength: 40, defense: 20, hp: 900, resource: 60, luck: 15, speed: 10 };
  return {
    id,
    nameKey: id === 'hero' ? 'class.warrior' : 'enemy.spireRat',
    sourceId: id === 'hero' ? 'warrior' : 'enemy.spire-rat',
    avatar: 'silhouette-warrior-m',
    baseStats: { ...stats },
    hp: stats.hp,
    maxHp: stats.hp,
    resource: { kind: 'rage', current: 0, pool: id === 'hero' ? stats.resource : 0 },
    signature: id === 'hero' ? 'berserkStrike' : null,
    effects: [],
    ...overrides,
  };
}

/** A companion with no resource pool and no signature, as the real ones are. */
function companion(overrides: Partial<Combatant> = {}, taunt = 0.5): ResolvePet {
  return {
    unit: unit('pet', {
      nameKey: 'pet.emberling',
      sourceId: 'pet.emberling',
      avatar: 'fire-flame-drop',
      ...overrides,
    }),
    aura: AURA,
    taunt,
  };
}

function fight(pet: ResolvePet | null, seed = 'companion'): CombatScript {
  return resolveCombat({
    hero: unit('hero'),
    ...(pet ? { pet } : {}),
    enemy: unit('enemy', { hp: 4000, maxHp: 4000 }),
    floor: 20,
    isBoss: false,
    seed,
  });
}

const hits = (script: CombatScript, source: 'hero' | 'pet' | 'enemy') =>
  script.events.filter((event) => event.type === 'hit' && event.source === source);

describe('a companion in the fight (Q42)', () => {
  it('changes nothing at all when none came along', () => {
    // The floor under everything else here: a hero climbing alone fights exactly
    // the fight they fought before companions existed.
    expect(fight(null)).toEqual(fight(null));
    expect(fight(null).events.some((event) => event.type === 'hit' && event.source === 'pet')).toBe(
      false,
    );
  });

  it('joins the fight and lands blows of its own', () => {
    const script = fight(companion());
    expect(hits(script, 'pet').length).toBeGreaterThan(0);

    const start = script.events[0];
    expect(start?.type === 'fightStart' && start.pet?.sourceId).toBe('pet.emberling');
  });

  it('takes its turn between the hero and the enemy', () => {
    // Order is the design: a fight with a companion is the same fight with one
    // extra blow in it, not a different order of the same ones.
    const order = fight(companion())
      .events.filter((event) => event.type === 'action')
      .map((event) => (event.type === 'action' ? event.unit : ''))
      .slice(0, 3);

    expect(order[0]).toBe('hero');
    expect(order).toContain('pet');
    expect(order.indexOf('pet')).toBeLessThan(order.indexOf('enemy'));
  });

  it('gives the hero its aura at the bell, before a blow is struck', () => {
    const script = fight(companion());
    const applied = script.events.findIndex(
      (event) => event.type === 'effectApplied' && event.effect.id === AURA.id,
    );
    const firstHit = script.events.findIndex((event) => event.type === 'hit');

    expect(applied).toBeGreaterThan(-1);
    expect(applied).toBeLessThan(firstHit);
    const event = script.events[applied];
    expect(event?.type === 'effectApplied' && event.unit).toBe('hero');
  });

  it('draws a share of what the enemy throws', () => {
    const struck = fight(companion({}, 0.9)).events.filter(
      (event) => event.type === 'hit' && event.source === 'enemy' && event.target === 'pet',
    );
    expect(struck.length).toBeGreaterThan(0);
  });

  it('lets the hero take everything when nothing draws it away', () => {
    const script = fight(companion({}, 0));
    const atPet = script.events.filter(
      (event) => event.type === 'hit' && event.source === 'enemy' && event.target === 'pet',
    );
    expect(atPet).toHaveLength(0);
  });

  it('names whom every action is aimed at, so the log cannot guess wrong', () => {
    for (const event of fight(companion()).events) {
      if (event.type !== 'action') continue;
      expect(['hero', 'pet', 'enemy']).toContain(event.target);
      expect(event.target).not.toBe(event.unit);
    }
  });

  it('stops acting once it goes down, and says so where it happens', () => {
    // One health point and all of the enemy's attention: it falls in the first
    // round, and the fight carries on without it.
    const script = fight(companion({ hp: 1, maxHp: 1 }, 1));
    const fell = script.events.findIndex(
      (event) => event.type === 'defeated' && event.unit === 'pet',
    );

    expect(fell).toBeGreaterThan(-1);
    const after = script.events.slice(fell);
    expect(after.some((event) => event.type === 'hit' && event.source === 'pet')).toBe(false);
  });

  it('never ends the fight by falling', () => {
    // A hero who cannot lose, so the assertion is about the companion's fall and
    // not about whether the hero happened to outlast the enemy afterwards.
    const script = resolveCombat({
      hero: unit('hero', { hp: 500_000, maxHp: 500_000 }),
      pet: companion({ hp: 1, maxHp: 1 }, 1),
      enemy: unit('enemy'),
      floor: 20,
      isBoss: false,
      seed: 'fallen',
    });

    expect(script.outcome.heroSurvived).toBe(true);
    expect(script.outcome.petSurvived).toBe(false);
    expect(script.outcome.winner).toBe('hero');
  });

  it('reports that it survived when it did', () => {
    const script = resolveCombat({
      hero: unit('hero', { hp: 500_000, maxHp: 500_000 }),
      pet: companion({ hp: 500_000, maxHp: 500_000 }, 1),
      enemy: unit('enemy'),
      floor: 20,
      isBoss: false,
      seed: 'standing',
    });
    expect(script.outcome.petSurvived).toBe(true);
  });

  it('says nothing about a companion that never came', () => {
    expect(fight(null).outcome.petSurvived).toBeUndefined();
  });

  it('helps: the enemy falls sooner with one along', () => {
    const alone = fight(null, 'shorter');
    const together = fight(companion(), 'shorter');
    expect(together.outcome.rounds).toBeLessThanOrEqual(alone.outcome.rounds);
  });

  it('stays replayable — the same seed writes the same fight', () => {
    expect(fight(companion(), 'replay')).toEqual(fight(companion(), 'replay'));
  });
});

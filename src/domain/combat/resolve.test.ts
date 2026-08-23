import { describe, expect, it } from 'vitest';
import { createCharacter } from '../character/character.ts';
import type { ClassId } from '../character/types.ts';
import { enemyCombatant, generateFloor } from '../tower/floors.ts';
import { fightFloor, heroCombatant } from '../tower/run.ts';
import { critChance, doubleAttackChance, resolveCombat } from './resolve.ts';
import type { Combatant, CombatEvent } from './types.ts';

/**
 * A fixed instant. Nothing here drinks potions, and pinning the clock is what
 * keeps these fights byte-identical between runs (ARCHITECTURE §5).
 */
const NOW = 1_700_000_000_000;

function hero(classId: ClassId = 'warrior', overrides: Partial<Combatant> = {}): Combatant {
  const character = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId,
    createdAt: 0,
    runSeed: 'combat-test',
  });
  return { ...heroCombatant(character, NOW), ...overrides };
}

function dummy(overrides: Partial<Combatant> = {}): Combatant {
  const stats = {
    strength: 10,
    defense: 5,
    hp: 400,
    resource: 10,
    luck: 0,
    speed: 0,
  };
  return {
    id: 'enemy',
    nameKey: 'enemy.spireRat',
    sourceId: 'enemy.dummy',
    avatar: 'silhouette-warrior-m',
    baseStats: stats,
    hp: stats.hp,
    maxHp: stats.hp,
    resource: { kind: 'mana', current: 0, pool: 0 },
    signature: null,
    effects: [],
    ...overrides,
  };
}

function eventsOfType<T extends CombatEvent['type']>(
  events: CombatEvent[],
  type: T,
): Extract<CombatEvent, { type: T }>[] {
  return events.filter((event): event is Extract<CombatEvent, { type: T }> => event.type === type);
}

describe('determinism (ARCHITECTURE §5, COMBAT.md §1)', () => {
  it('produces an identical script for the same seed', () => {
    const a = resolveCombat({ hero: hero(), enemy: dummy(), floor: 3, isBoss: false, seed: 's' });
    const b = resolveCombat({ hero: hero(), enemy: dummy(), floor: 3, isBoss: false, seed: 's' });
    expect(a).toEqual(b);
  });

  it('produces a different fight for a different seed', () => {
    const a = resolveCombat({ hero: hero(), enemy: dummy(), floor: 3, isBoss: false, seed: 'a' });
    const b = resolveCombat({ hero: hero(), enemy: dummy(), floor: 3, isBoss: false, seed: 'b' });
    expect(a.events).not.toEqual(b.events);
  });

  it('never mutates the combatants it was handed', () => {
    const attacker = hero();
    const defender = dummy();
    const beforeHero = structuredClone(attacker);
    const beforeEnemy = structuredClone(defender);

    resolveCombat({ hero: attacker, enemy: defender, floor: 5, isBoss: false, seed: 's' });

    expect(attacker).toEqual(beforeHero);
    expect(defender).toEqual(beforeEnemy);
  });

  it('is serializable, so a bug report can carry a whole fight', () => {
    const script = resolveCombat({
      hero: hero('bard'),
      enemy: dummy(),
      floor: 7,
      isBoss: false,
      seed: 's',
    });
    expect(JSON.parse(JSON.stringify(script))).toEqual(script);
  });
});

describe('script structure (COMBAT.md §6)', () => {
  const script = resolveCombat({
    hero: hero(),
    enemy: dummy(),
    floor: 2,
    isBoss: false,
    seed: 'structure',
  });

  it('opens with a fight start carrying both snapshots', () => {
    const first = script.events[0]!;
    expect(first.type).toBe('fightStart');
    if (first.type === 'fightStart') {
      expect(first.hero.maxHp).toBeGreaterThan(0);
      expect(first.enemy.maxHp).toBeGreaterThan(0);
    }
  });

  it('closes with a fight end that agrees with the outcome', () => {
    const last = script.events.at(-1)!;
    expect(last.type).toBe('fightEnd');
    if (last.type === 'fightEnd') {
      expect(last.winner).toBe(script.outcome.winner);
      expect(last.rounds).toBe(script.outcome.rounds);
    }
  });

  it('reports the target’s health on every hit, so the performer never recomputes', () => {
    for (const hit of eventsOfType(script.events, 'hit')) {
      expect(hit.targetHp).toBeGreaterThanOrEqual(0);
      expect(hit.amount).toBeGreaterThanOrEqual(1);
    }
  });

  it('numbers rounds from one, without gaps', () => {
    const rounds = eventsOfType(script.events, 'roundStart').map((event) => event.round);
    expect(rounds).toEqual(rounds.map((_, index) => index + 1));
  });
});

describe('stats do what the brief says they do', () => {
  it('Strength raises damage (Brief §6)', () => {
    const weak = resolveCombat({
      hero: hero('warrior', { baseStats: { ...dummy().baseStats, strength: 10 }, signature: null }),
      enemy: dummy(),
      floor: 1,
      isBoss: false,
      seed: 'str',
    });
    const strong = resolveCombat({
      hero: hero('warrior', { baseStats: { ...dummy().baseStats, strength: 40 }, signature: null }),
      enemy: dummy(),
      floor: 1,
      isBoss: false,
      seed: 'str',
    });

    const total = (events: CombatEvent[]): number =>
      eventsOfType(events, 'hit')
        .filter((hit) => hit.source === 'hero')
        .reduce((sum, hit) => sum + hit.amount, 0);

    expect(total(strong.events)).toBeGreaterThan(total(weak.events));
  });

  it('Defense reduces incoming damage without ever reaching immunity', () => {
    const soft = resolveCombat({
      hero: hero('warrior', { signature: null }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, defense: 0 } }),
      floor: 1,
      isBoss: false,
      seed: 'def',
    });
    const armoured = resolveCombat({
      hero: hero('warrior', { signature: null }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, defense: 400 } }),
      floor: 1,
      isBoss: false,
      seed: 'def',
    });

    const firstHit = (events: CombatEvent[]): number =>
      eventsOfType(events, 'hit').find((hit) => hit.source === 'hero')?.amount ?? 0;

    expect(firstHit(armoured.events)).toBeLessThan(firstHit(soft.events));
    // Never zero: every blow does something (COMBAT.md §2).
    expect(firstHit(armoured.events)).toBeGreaterThanOrEqual(1);
  });

  it('Luck raises crit rate, band-relative and capped', () => {
    expect(critChance(0, 1)).toBe(0);
    expect(critChance(100, 1)).toBeGreaterThan(critChance(20, 1));
    expect(critChance(1_000_000, 1)).toBeLessThanOrEqual(0.6);
    // The same Luck is worth less deeper in the tower, which is what keeps crit
    // a live stat rather than a solved one (Brief §3.7).
    expect(critChance(100, 100)).toBeLessThan(critChance(100, 1));
  });

  it('Speed grants a chance to strike twice before the enemy acts (Brief §4.2)', () => {
    expect(doubleAttackChance(0, 1)).toBe(0);
    expect(doubleAttackChance(1_000_000, 1)).toBeLessThanOrEqual(0.5);

    const fast = resolveCombat({
      hero: hero('warrior', {
        baseStats: { ...dummy().baseStats, speed: 500, strength: 5 },
        signature: null,
      }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, hp: 4000 } }),
      floor: 1,
      isBoss: false,
      seed: 'speed',
    });

    const doubles = eventsOfType(fast.events, 'action').filter(
      (action) => action.kind === 'doubleStrike',
    );
    expect(doubles.length).toBeGreaterThan(0);
  });
});

describe('signature moves (Q6/Q26)', () => {
  it('fires when the bar fills and empties it again', () => {
    const script = resolveCombat({
      hero: hero('mage', { resource: { kind: 'mana', current: 0, pool: 10 } }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, hp: 5000 } }),
      floor: 1,
      isBoss: false,
      seed: 'sig',
    });

    const signatures = eventsOfType(script.events, 'action').filter(
      (action) => action.kind === 'signature',
    );
    expect(signatures.length).toBeGreaterThan(0);
    expect(signatures[0]!.signature).toBe('arcaneBlast');

    // Spending the bar is visible in the script, so the UI can animate it.
    const spent = eventsOfType(script.events, 'resource').filter(
      (event) => event.unit === 'hero' && event.to === 0 && event.from > 0,
    );
    expect(spent.length).toBeGreaterThan(0);
  });

  it('gives the Warrior Shield Slam with a shield and Berserk Strike without', () => {
    const withShield = createCharacter({
      slotId: 1,
      name: 'Shielded',
      classId: 'warrior',
      createdAt: 0,
      runSeed: 'shield',
    });
    expect(heroCombatant(withShield, NOW).signature).toBe('shieldSlam');

    const twoHanded = { ...withShield, equipment: { mainhand: withShield.equipment.mainhand } };
    expect(heroCombatant(twoHanded, NOW).signature).toBe('berserkStrike');
  });

  it('lands the Hunter’s volley as several separate blows, each able to crit', () => {
    const script = resolveCombat({
      hero: hero('hunter', {
        resource: { kind: 'mana', current: 0, pool: 6 },
        baseStats: { ...dummy().baseStats, strength: 30, luck: 200 },
      }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, hp: 100_000, strength: 1 } }),
      floor: 1,
      isBoss: false,
      seed: 'volley',
    });

    const events = script.events;
    const signatureIndex = events.findIndex(
      (event) => event.type === 'action' && event.kind === 'signature',
    );
    expect(signatureIndex).toBeGreaterThanOrEqual(0);

    // The four arrows arrive as four hit events, not one lump.
    const following = events.slice(signatureIndex + 1, signatureIndex + 6);
    const hits = following.filter((event) => event.type === 'hit');
    expect(hits.length).toBeGreaterThan(1);
  });

  it('lets the Swashbuckler’s feint eat the next attack outright', () => {
    const script = resolveCombat({
      hero: hero('swashbuckler', {
        resource: { kind: 'focus', current: 0, pool: 4 },
        baseStats: { ...dummy().baseStats, speed: 300, strength: 6, hp: 40_000 },
        hp: 40_000,
        maxHp: 40_000,
      }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, hp: 50_000, strength: 20 } }),
      floor: 1,
      isBoss: false,
      seed: 'feint',
    });

    expect(eventsOfType(script.events, 'dodged').length).toBeGreaterThan(0);
  });

  it('has the Bard rotate songs rather than replaying one', () => {
    const script = resolveCombat({
      hero: hero('bard', {
        resource: { kind: 'mana', current: 0, pool: 4 },
        baseStats: { ...dummy().baseStats, strength: 8 },
      }),
      enemy: dummy({ baseStats: { ...dummy().baseStats, hp: 200_000, strength: 1 } }),
      floor: 1,
      isBoss: false,
      seed: 'songs',
    });

    const songs = eventsOfType(script.events, 'effectApplied')
      .filter((event) => event.unit === 'hero')
      .map((event) => event.effect.id);
    expect(new Set(songs).size).toBeGreaterThan(1);
  });
});

describe('floor effects (Brief §3.2)', () => {
  it('applies boss modifiers before the first blow', () => {
    const floor = generateFloor('boss-run', 10);
    expect(floor.isBoss).toBe(true);
    expect(floor.effects.length).toBeGreaterThan(0);

    const script = resolveCombat({
      hero: hero(),
      enemy: enemyCombatant(floor),
      floor: 10,
      isBoss: true,
      floorEffects: floor.effects,
      seed: 'boss',
    });

    const applied = eventsOfType(script.events, 'effectApplied');
    expect(applied.length).toBeGreaterThanOrEqual(floor.effects.length);
    // The debuff lands on the player and the buff on the boss (§3.2).
    expect(applied.some((event) => event.unit === 'hero')).toBe(true);
    expect(applied.some((event) => event.unit === 'enemy')).toBe(true);
  });
});

describe('the endless-fight guard (COMBAT.md §3)', () => {
  it('ends a fight neither side can win, in favour of the healthier unit', () => {
    const stalemate = {
      strength: 1,
      defense: 100_000,
      hp: 10_000,
      resource: 0,
      luck: 0,
      speed: 0,
    };
    const script = resolveCombat({
      hero: hero('warrior', { baseStats: stalemate, hp: 10_000, maxHp: 10_000, signature: null }),
      enemy: dummy({ baseStats: stalemate, hp: 9_000, maxHp: 10_000 }),
      floor: 1,
      isBoss: false,
      seed: 'stalemate',
    });

    expect(script.outcome.byRoundCap).toBe(true);
    expect(script.outcome.winner).toBe('hero');
    expect(script.outcome.rounds).toBe(100);
  });
});

describe('a real fight on floor 1', () => {
  it('a fresh hero beats the first floor', () => {
    for (const classId of ['warrior', 'mage', 'hunter', 'bard', 'swashbuckler'] as const) {
      const character = createCharacter({
        slotId: 1,
        name: 'Newborn',
        classId,
        createdAt: 0,
        runSeed: `first:${classId}`,
      });
      const result = fightFloor(character, 1, NOW);
      expect(result.cleared, `${classId} lost on floor 1`).toBe(true);
    }
  });
});

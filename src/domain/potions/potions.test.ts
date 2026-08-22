import { describe, expect, it } from 'vitest';
import { potionFor, potionsForBracket } from '@/content/items/potions.ts';
import { POTION_DURATION_MS } from '@/content/balance/potions.ts';
import { combatStatsOf, createCharacter, totalStatsOf } from '@/domain/character/character.ts';
import { powerLevel } from '@/domain/power/power.ts';
import { equippedItems } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { activePotions, drink, isActive, potionBonus, prune, remainingMs } from './potions.ts';

const NOW = 1_700_000_000_000;

function hero(): Character {
  return createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: NOW,
    runSeed: 'potion-test',
  });
}

describe('drinking (Q18)', () => {
  it('runs for exactly an hour of real time (Brief §12, Q9)', () => {
    const potions = drink({}, potionFor('strength', 3), NOW);
    expect(potions.strength?.expiresAt).toBe(NOW + POTION_DURATION_MS);
    expect(remainingMs(potions.strength!, NOW)).toBe(POTION_DURATION_MS);
  });

  it('replaces the one already running rather than stacking with it', () => {
    const first = drink({}, potionFor('strength', 3), NOW);
    const second = drink(first, potionFor('strength', 3), NOW + 60_000);

    expect(activePotions(second, NOW + 60_000)).toHaveLength(1);
    expect(second.strength?.expiresAt).toBe(NOW + 60_000 + POTION_DURATION_MS);
  });

  it('lets every potionable stat run at once (Q18)', () => {
    let potions = {};
    for (const potion of potionsForBracket(2)) potions = drink(potions, potion, NOW);
    expect(activePotions(potions, NOW)).toHaveLength(5);
  });

  it('stops working the moment it expires, not a tick later', () => {
    const potions = drink({}, potionFor('luck', 0), NOW);
    expect(isActive(potions, 'luck', NOW + POTION_DURATION_MS - 1)).toBe(true);
    expect(isActive(potions, 'luck', NOW + POTION_DURATION_MS)).toBe(false);
  });

  it('burns down while the game is closed (Q9)', () => {
    const potions = drink({}, potionFor('hp', 1), NOW);
    // Two hours later — the tab was shut for all of it.
    expect(activePotions(potions, NOW + 2 * POTION_DURATION_MS)).toEqual([]);
  });

  it('prunes what has run out without changing what is still running', () => {
    let potions = drink({}, potionFor('hp', 1), NOW);
    potions = drink(potions, potionFor('luck', 1), NOW + POTION_DURATION_MS);

    const pruned = prune(potions, NOW + POTION_DURATION_MS + 1);
    expect(Object.keys(pruned)).toEqual(['luck']);
  });
});

describe('what a potion actually does', () => {
  it('adds a percentage of the stat, so it never dies of inflation', () => {
    const character = hero();
    const durable = totalStatsOf(character);
    const potions = drink({}, potionFor('strength', 0), NOW);
    const bonus = potionBonus(durable, potions, NOW);

    expect(bonus.strength).toBeGreaterThan(0);
    expect(bonus.defense).toBe(0);
  });

  it('shows up in what the hero fights with', () => {
    const character = hero();
    const drunk: Character = { ...character, potions: drink({}, potionFor('strength', 0), NOW) };

    expect(combatStatsOf(drunk, NOW).strength).toBeGreaterThan(totalStatsOf(drunk).strength);
    // And is gone again an hour later, with nothing to clean up.
    expect(combatStatsOf(drunk, NOW + POTION_DURATION_MS).strength).toBe(
      totalStatsOf(drunk).strength,
    );
  });

  it('never moves Power Level — a drinkable bracket jump is the overshoot §13 bans', () => {
    const character = hero();
    const drunk: Character = { ...character, potions: drink({}, potionFor('strength', 0), NOW) };

    const of = (subject: Character): number =>
      powerLevel({
        equipped: equippedItems(subject),
        stats: totalStatsOf(subject),
        ascension: subject.progression.ascension,
        highestFloorEverCleared: subject.tower.highestFloorEverCleared,
      });

    expect(of(drunk)).toBe(of(character));
  });

  it('cannot be brewed for Speed, which comes only from gear (§6)', () => {
    const stats = potionsForBracket(5).map((potion) => potion.stat);
    expect(stats).not.toContain('speed');
  });
});

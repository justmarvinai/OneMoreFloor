import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { MERCHANT_RESTOCK_MS } from '@/content/balance/merchants.ts';
import { restock } from '@/domain/merchants/merchants.ts';
import { bracketForCharacter } from '@/domain/tower/run.ts';
import { computeBadges } from './badges.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: NOW,
    runSeed: 'badge-test',
  });
  return { ...base, ...overrides };
}

describe('red-dot truth (Brief §20.5)', () => {
  it('never dots the tower — climbing is always available, so a dot says nothing', () => {
    expect(computeBadges(hero(), NOW).tower).toBe(false);
  });

  it('never dots quests before quests exist', () => {
    expect(computeBadges(hero(), NOW).quests).toBe(false);
  });

  it('dots the character screen when gold could buy a stat point', () => {
    const broke = hero();
    expect(computeBadges(broke, NOW).character).toBe(false);

    const funded = hero({ currencies: { gold: 100_000, tickets: 0, luckyTickets: 0 } });
    expect(computeBadges(funded, NOW).character).toBe(true);
  });

  it('dots the character screen when the hero can ascend', () => {
    const capped = hero({ progression: { level: 100, xp: 0, ascension: 0 } });
    expect(computeBadges(capped, NOW).character).toBe(true);
  });

  it('dots the merchants when their shelf has aged out (Q17)', () => {
    // A brand-new character's shelves have never been rolled for their real
    // bracket, so the very first visit genuinely has new goods waiting.
    const fresh = hero();
    expect(computeBadges(fresh, NOW).merchants).toBe(true);

    const context = {
      now: NOW,
      bracketIndex: bracketForCharacter(fresh).index,
      highestFloor: fresh.tower.highestFloorEverCleared,
    };
    const stocked = hero({
      merchants: {
        equipment: restock('equipment', fresh.tower.runSeed, context),
        magic: restock('magic', fresh.tower.runSeed, context),
      },
    });

    expect(computeBadges(stocked, NOW).merchants).toBe(false);
    expect(computeBadges(stocked, NOW + MERCHANT_RESTOCK_MS).merchants).toBe(true);
  });

  it('dots the merchants when something on the shelf is affordable', () => {
    const rich = hero({ currencies: { gold: 1_000_000, tickets: 0, luckyTickets: 0 } });
    expect(computeBadges(rich, NOW).merchants).toBe(true);
  });
});

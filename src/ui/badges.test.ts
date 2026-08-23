import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { MERCHANT_RESTOCK_MS } from '@/content/balance/merchants.ts';
import { restock } from '@/domain/merchants/merchants.ts';
import { rollBoard } from '@/domain/quests/quests.ts';
import { createAccount } from '@/domain/character/account.ts';
import { dayKeyOf } from '@/app/time.ts';
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

  it('dots quests only when a reward is sitting there', () => {
    const fresh = hero();
    expect(computeBadges(fresh, NOW).quests).toBe(false);

    const context = {
      bracketIndex: bracketForCharacter(fresh).index,
      materialTier: 0,
      referenceFloor: 5,
      seed: fresh.tower.runSeed,
    };
    const board = rollBoard('daily', dayKeyOf(NOW), context);
    const waiting = hero({
      quests: {
        daily: { ...board, quests: board.quests.map((q) => ({ ...q, progress: q.target })) },
        weekly: { periodKey: '', quests: [] },
      },
    });

    expect(computeBadges(waiting, NOW).quests).toBe(true);
  });

  it('dots the account screen only when an upgrade is affordable (§15)', () => {
    const broke = hero();
    expect(computeBadges(broke, NOW, createAccount()).upgrades).toBe(false);

    const rich = hero({ currencies: { gold: 5_000, tickets: 0, luckyTickets: 0 } });
    expect(computeBadges(rich, NOW, createAccount()).upgrades).toBe(true);
  });

  it('dots the character screen when gold could buy a stat point', () => {
    const broke = hero();
    expect(computeBadges(broke, NOW).character).toBe(false);

    const funded = hero({ currencies: { gold: 100_000, tickets: 0, luckyTickets: 0 } });
    expect(computeBadges(funded, NOW).character).toBe(true);
  });

  it('dots the character screen when a better piece is sitting in the bag', () => {
    // The most actionable thing in the game: a drop the player has not put on.
    // M9's playtest found a hero nine floors in wearing one item with six
    // better ones in the backpack and nothing on screen saying so.
    const bare = hero();
    const worn = bare.equipment.mainhand!;
    const upgrade = { ...worn, uid: 'better', budget: worn.budget * 3 };

    expect(computeBadges({ ...bare, inventory: [] }, NOW).character).toBe(
      computeBadges({ ...bare, inventory: [] }, NOW).character,
    );
    expect(computeBadges({ ...bare, inventory: [upgrade] }, NOW).character).toBe(true);

    // …and not for a piece that is worse than what is already worn.
    const junk = { ...worn, uid: 'junk', budget: worn.budget * 0.5 };
    const broke = {
      ...bare,
      currencies: { gold: 0, tickets: 0, luckyTickets: 0 },
      inventory: [junk],
    };
    expect(computeBadges(broke, NOW).character).toBe(false);
  });

  it('dots the character screen when the hero can ascend', () => {
    const capped = hero({ progression: { level: 100, xp: 0, ascension: 0 } });
    expect(computeBadges(capped, NOW).character).toBe(true);
  });

  it('dots each merchant when their own shelf has aged out (Q17)', () => {
    // A brand-new character's shelves have never been rolled for their real
    // bracket, so the very first visit genuinely has new goods waiting.
    const fresh = hero();
    expect(computeBadges(fresh, NOW).equipmentMerchant).toBe(true);
    expect(computeBadges(fresh, NOW).magicMerchant).toBe(true);

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

    expect(computeBadges(stocked, NOW).equipmentMerchant).toBe(false);
    expect(computeBadges(stocked, NOW + MERCHANT_RESTOCK_MS).equipmentMerchant).toBe(true);
  });

  it('dots each merchant when something on their own shelf is affordable', () => {
    const rich = hero({ currencies: { gold: 1_000_000, tickets: 0, luckyTickets: 0 } });
    expect(computeBadges(rich, NOW).equipmentMerchant).toBe(true);
    expect(computeBadges(rich, NOW).magicMerchant).toBe(true);
  });

  /**
   * The dot has to name the right counter. Two shops sharing one dot sends the
   * player to whichever they guess, and half the time there is nothing there —
   * which is the kind of lie that teaches players to stop reading dots.
   */
  it('does not dot the equipment counter for a draught the alchemist is pouring', () => {
    const context = {
      now: NOW,
      bracketIndex: bracketForCharacter(hero()).index,
      highestFloor: 0,
    };
    const base = hero();
    const stocked = hero({
      currencies: { gold: 1_000_000, tickets: 0, luckyTickets: 0 },
      merchants: {
        equipment: restock('equipment', base.tower.runSeed, context),
        magic: restock('magic', base.tower.runSeed, context),
      },
    });

    // Both shelves are freshly rolled and the purse is bottomless, so both dot.
    // Buy out *one* shelf and only the other should still be lit. The shelf is
    // regenerated from its seed, so "sold" is a generous index range rather than
    // a count taken from a stock array that does not exist on the state.
    const soldOut = {
      ...stocked,
      merchants: {
        ...stocked.merchants,
        equipment: {
          ...stocked.merchants.equipment,
          sold: Array.from({ length: 64 }, (_, index) => index),
        },
      },
    };
    expect(computeBadges(soldOut, NOW).equipmentMerchant).toBe(false);
    expect(computeBadges(soldOut, NOW).magicMerchant).toBe(true);
  });
});

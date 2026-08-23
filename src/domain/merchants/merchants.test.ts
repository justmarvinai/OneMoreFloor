import { describe, expect, it } from 'vitest';
import { affixBudget } from '@/domain/items/derive.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { bracketForCharacter } from '@/domain/tower/run.ts';
import { MERCHANT_RESTOCK_MS, MERCHANT_MILESTONE_FLOORS } from '@/content/balance/merchants.ts';
import {
  buyPrice,
  createMerchants,
  needsRestock,
  nextRestockAt,
  potionStock,
  rerollCost,
  restock,
  stockOf,
  MERCHANT_IDS,
} from './merchants.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'merchant-test',
    }),
    ...overrides,
  };
}

describe('merchant stock', () => {
  it('is derived from the seed, so the same shelf comes back every time', () => {
    const character = hero();
    const bracket = bracketForCharacter(character);
    const first = stockOf('equipment', character, character.merchants.equipment, bracket);
    const second = stockOf('equipment', character, character.merchants.equipment, bracket);
    expect(first).toEqual(second);
  });

  it('never exceeds the character’s bracket — the §13 guarantee, through the shop', () => {
    for (let index = 0; index < 20; index += 1) {
      const bracket = bracketAt(index);
      const character = hero();
      for (const id of MERCHANT_IDS) {
        const state = restock(id, 'sweep', {
          now: NOW,
          bracketIndex: index,
          highestFloor: index * 12,
        });
        for (const entry of stockOf(id, character, state, bracket)) {
          expect(
            affixBudget(entry.item),
            `${id} bracket ${index} sold ${entry.item.defId} over ceiling`,
          ).toBeLessThanOrEqual(bracket.window.max + 1e-6);
          expect(entry.item.bracketAtDrop).toBe(index);
        }
      }
    }
  });

  it('only sells what the hero could wear — no relics before ascension 4 (Q22)', () => {
    const character = hero();
    const bracket = bracketAt(12);
    const state = restock('magic', 'gate', { now: NOW, bracketIndex: 12, highestFloor: 120 });

    const slots = stockOf('magic', character, state, bracket).map((entry) => entry.item.defId);
    expect(slots.some((id) => id.includes('.relic.'))).toBe(false);
    expect(slots.some((id) => id.includes('.artifact.'))).toBe(false);
  });

  it('deals only in its own half of the shop (Brief §11 vs §12)', () => {
    const character = hero({ progression: { level: 400, xp: 0, ascension: 5 } });
    const bracket = bracketAt(14);

    const magic = stockOf(
      'magic',
      character,
      restock('magic', 'split', { now: NOW, bracketIndex: 14, highestFloor: 140 }),
      bracket,
    );
    for (const entry of magic) {
      expect(entry.item.defId).toMatch(/\.(ring|necklace|amulet|relic|artifact)\./);
    }

    const gear = stockOf(
      'equipment',
      character,
      restock('equipment', 'split', { now: NOW, bracketIndex: 14, highestFloor: 140 }),
      bracket,
    );
    for (const entry of gear) {
      expect(entry.item.defId).not.toMatch(/\.(ring|necklace|amulet|relic|artifact)\./);
    }
  });

  it('prices a piece above what it sells back for (Q16)', () => {
    const character = hero();
    const bracket = bracketForCharacter(character);
    for (const entry of stockOf('equipment', character, character.merchants.equipment, bracket)) {
      expect(entry.price).toBeGreaterThan(0);
    }
  });
});

describe('restock (Q17)', () => {
  const base = createMerchants('restock-test', NOW).equipment;
  const context = { now: NOW, bracketIndex: 0, highestFloor: 0 };

  it('leaves a fresh shelf alone', () => {
    expect(needsRestock(base, context)).toBe(false);
  });

  it('ages out after the free interval', () => {
    expect(needsRestock(base, { ...context, now: NOW + MERCHANT_RESTOCK_MS })).toBe(true);
    expect(nextRestockAt(base)).toBe(NOW + MERCHANT_RESTOCK_MS);
  });

  it('refills on a new best-floor milestone, not on every floor', () => {
    expect(needsRestock(base, { ...context, highestFloor: MERCHANT_MILESTONE_FLOORS - 1 })).toBe(
      false,
    );
    expect(needsRestock(base, { ...context, highestFloor: MERCHANT_MILESTONE_FLOORS })).toBe(true);
  });

  it('refills when the hero outgrows the bracket it was rolled for', () => {
    expect(needsRestock(base, { ...context, bracketIndex: 1 })).toBe(true);
  });

  it('clears what was sold and moves the clock forward', () => {
    const sold = { ...base, sold: [0, 3] };
    const next = restock('equipment', 'restock-test', { ...context, now: NOW + 10 });
    expect(sold.sold).toEqual([0, 3]);
    expect(next.sold).toEqual([]);
    expect(next.stockedAt).toBe(NOW + 10);
    expect(next.stockSeed).not.toBe(base.stockSeed);
  });

  it('charges more to skip the wait the deeper the hero is', () => {
    expect(rerollCost(6)).toBeGreaterThan(rerollCost(0));
  });
});

describe('the magic merchant’s draughts (Brief §12)', () => {
  it('stocks one per stat a potion may raise — and never Speed (§6)', () => {
    const potions = potionStock(bracketAt(3));
    expect(potions).toHaveLength(5);
    expect(potions.map((potion) => potion.stat)).not.toContain('speed');
    expect(new Set(potions.map((potion) => potion.stat)).size).toBe(5);
  });

  it('brews stronger and dearer draughts deeper down', () => {
    const shallow = potionStock(bracketAt(0))[0]!;
    const deep = potionStock(bracketAt(12))[0]!;
    expect(deep.magnitude).toBeGreaterThan(shallow.magnitude);
    expect(deep.price).toBeGreaterThan(shallow.price);
  });
});

describe('buy price', () => {
  it('rises with the bracket a piece was made for', () => {
    const character = hero();
    const cheap = stockOf(
      'equipment',
      character,
      restock('equipment', 'price', { now: NOW, bracketIndex: 0, highestFloor: 0 }),
      bracketAt(0),
    )[0]!;
    const dear = stockOf(
      'equipment',
      character,
      restock('equipment', 'price', { now: NOW, bracketIndex: 10, highestFloor: 100 }),
      bracketAt(10),
    )[0]!;
    expect(buyPrice(dear.item)).toBeGreaterThan(buyPrice(cheap.item));
  });
});

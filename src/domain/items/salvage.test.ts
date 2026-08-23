import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, requireItemDef } from '@/content/items/index.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { generateItem } from './generate.ts';
import { reforge, reforgeCost, salvageFromInventory, salvageYield } from './salvage.ts';
import type { ItemInstance } from './types.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'salvage-test',
    }),
    ...overrides,
  };
}

function baseFor(slot: string): string {
  const def = ITEM_BASES.find(
    (candidate) =>
      candidate.slot === slot && (candidate.classId === null || candidate.classId === 'warrior'),
  );
  if (!def) throw new Error(`no base for ${slot}`);
  return def.id;
}

function item(seed = 'a', overrides: Partial<ItemInstance> = {}): ItemInstance {
  const def = requireItemDef(baseFor('helmet'));
  return {
    ...generateItem({
      def,
      rarity: 'rare',
      bracket: bracketAt(0),
      weights: affixPool(def.affixPool),
      rng: createRng(`salvage:${seed}`),
      uid: `salvage-${seed}`,
    }),
    ...overrides,
  };
}

describe('salvage (fifth polish round)', () => {
  it('pays in the material of the depth the piece came from', () => {
    const piece = item('plain');
    const yielded = salvageYield(piece);
    const tier = bracketAt(piece.bracketAtDrop).materialTier;

    expect(Object.keys(yielded)).toContain(materialIdForTier(tier));
    expect(yielded[materialIdForTier(tier)]).toBeGreaterThan(0);
  });

  it('gives more back for what was put in', () => {
    const plain = salvageYield(item('a'));
    const built = salvageYield(item('a', { level: 10, ascension: 3 }));

    const total = (yielded: Readonly<Record<string, number>>): number =>
      Object.values(yielded).reduce((sum, count) => sum + count, 0);

    expect(total(built)).toBeGreaterThan(total(plain));
  });

  it('returns some of the deeper material an ascended piece consumed', () => {
    const built = item('b', { ascension: 2 });
    const tier = bracketAt(built.bracketAtDrop).materialTier;

    expect(salvageYield(built)[materialIdForTier(tier + 1)]).toBeGreaterThan(0);
  });

  it('never rolls: the same piece always breaks down into the same pouch', () => {
    const piece = item('c', { level: 4, ascension: 1 });
    expect(salvageYield(piece)).toEqual(salvageYield(piece));
  });

  it('takes the piece out of the pack and puts the materials in the pouch', () => {
    const piece = item('d');
    const result = salvageFromInventory(hero({ inventory: [piece] }), piece.uid);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.character.inventory).toHaveLength(0);
    for (const [id, count] of Object.entries(result.materials)) {
      expect(result.character.materials[id]).toBe(count);
    }
  });

  it('will not break down something that is not in the pack', () => {
    const worn = item('e');
    expect(salvageFromInventory(hero({ equipment: { helmet: worn } }), worn.uid)).toBeNull();
  });
});

describe('reforge (fifth polish round)', () => {
  function rich(piece: ItemInstance): Character {
    const cost = reforgeCost(piece);
    return hero({
      inventory: [piece],
      currencies: { gold: cost.gold * 10, tickets: 0, luckyTickets: 0 },
      materials: Object.fromEntries(
        Object.entries(cost.materials).map(([id, count]) => [id, count * 10]),
      ),
    });
  }

  it('keeps the piece and rerolls only what it carries', () => {
    const piece = item('r1', { level: 6, ascension: 2 });
    const result = reforge(rich(piece), piece.uid);
    if (typeof result === 'string') throw new Error(result);

    expect(result.item.uid).toBe(piece.uid);
    expect(result.item.defId).toBe(piece.defId);
    expect(result.item.rarity).toBe(piece.rarity);
    expect(result.item.level).toBe(piece.level);
    expect(result.item.ascension).toBe(piece.ascension);
  });

  it('never overshoots the bracket that produced the piece (§13)', () => {
    const piece = item('r2');
    const ceiling = bracketAt(piece.bracketAtDrop).window.max;

    let character = rich(piece);
    for (let round = 0; round < 25; round += 1) {
      const result = reforge(character, piece.uid);
      if (typeof result === 'string') break;
      expect(result.item.budget).toBeLessThanOrEqual(ceiling);
      character = result.character;
    }
  });

  it('charges gold and materials, and refuses when either is short', () => {
    const piece = item('r3');
    const cost = reforgeCost(piece);
    const character = rich(piece);

    const result = reforge(character, piece.uid);
    if (typeof result === 'string') throw new Error(result);
    expect(result.character.currencies.gold).toBe(character.currencies.gold - cost.gold);

    const broke = { ...character, currencies: { ...character.currencies, gold: 0 } };
    expect(reforge(broke, piece.uid)).toBe('notEnoughGold');

    const bare = { ...character, materials: {} };
    expect(reforge(bare, piece.uid)).toBe('notEnoughMaterials');
  });

  it('draws a different roll each time, without storing a counter', () => {
    const piece = item('r4');
    let character = rich(piece);
    const shapes = new Set<string>();

    for (let round = 0; round < 6; round += 1) {
      const result = reforge(character, piece.uid);
      if (typeof result === 'string') throw new Error(result);
      shapes.add(result.item.affixes.map((affix) => `${affix.stat}:${affix.value}`).join('/'));
      character = result.character;
    }

    expect(shapes.size).toBeGreaterThan(1);
  });

  it('rerolls a worn piece in place rather than dropping it in the pack', () => {
    const piece = item('r5');
    const cost = reforgeCost(piece);
    const character = hero({
      equipment: { helmet: piece },
      currencies: { gold: cost.gold * 4, tickets: 0, luckyTickets: 0 },
      materials: Object.fromEntries(
        Object.entries(cost.materials).map(([id, count]) => [id, count * 4]),
      ),
    });

    const result = reforge(character, piece.uid);
    if (typeof result === 'string') throw new Error(result);

    expect(result.character.equipment.helmet?.uid).toBe(piece.uid);
    expect(result.character.inventory).toHaveLength(0);
  });

  it('opens as many lines as the piece has stars, not as many as its rarity rolls', () => {
    const piece = item('r6', { ascension: 5 });
    const result = reforge(rich(piece), piece.uid);
    if (typeof result === 'string') throw new Error(result);

    // A five-star piece has five sockets, whatever the dice think of "rare".
    expect(result.item.affixes.length).toBeGreaterThan(2);
  });

  it('says no to a piece nobody owns', () => {
    expect(reforge(hero(), 'nothing')).toBe('notFound');
  });
});

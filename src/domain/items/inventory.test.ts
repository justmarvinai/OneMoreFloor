import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { STARTING_BACKPACK_SLOTS as INVENTORY_CAPACITY } from '@/content/balance/account.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, requireItemDef } from '@/content/items/index.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { generateItem } from './generate.ts';
import {
  addToInventory,
  freeSlots,
  isFull,
  leastValuable,
  sellFromInventory,
} from './inventory.ts';
import { equipFromInventory, unequip } from './loadout.ts';
import type { ItemInstance } from './types.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'inventory-test',
    }),
    ...overrides,
  };
}

function item(defId: string, seed = 'a'): ItemInstance {
  const def = requireItemDef(defId);
  return generateItem({
    def,
    rarity: 'rare',
    bracket: bracketAt(0),
    weights: affixPool(def.affixPool),
    rng: createRng(`inv:${defId}:${seed}`),
    uid: `inv-${defId}-${seed}`,
  });
}

/** Any base a Warrior can wear in the given slot. */
function baseFor(slot: string): string {
  const def = ITEM_BASES.find(
    (candidate) =>
      candidate.slot === slot && (candidate.classId === null || candidate.classId === 'warrior'),
  );
  if (!def) throw new Error(`no base for ${slot}`);
  return def.id;
}

describe('the backpack (Q16)', () => {
  it('holds the configured number of pieces and no more', () => {
    let character = hero();
    for (let index = 0; index < INVENTORY_CAPACITY; index += 1) {
      const result = addToInventory(
        character,
        item(baseFor('helmet'), `f${index}`),
        INVENTORY_CAPACITY,
      );
      expect(result.ok).toBe(true);
      if (result.ok) character = result.character;
    }

    expect(isFull(character, INVENTORY_CAPACITY)).toBe(true);
    expect(freeSlots(character, INVENTORY_CAPACITY)).toBe(0);
  });

  it('refuses a drop rather than swallowing it', () => {
    let character = hero();
    for (let index = 0; index < INVENTORY_CAPACITY; index += 1) {
      const added = addToInventory(
        character,
        item(baseFor('helmet'), `g${index}`),
        INVENTORY_CAPACITY,
      );
      if (added.ok) character = added.character;
    }

    const overflow = addToInventory(character, item(baseFor('chest'), 'extra'), INVENTORY_CAPACITY);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('full');
    // The pack is untouched, so the caller can open the resolution dialog.
    expect(overflow.character.inventory).toHaveLength(INVENTORY_CAPACITY);
  });

  it('pays gold for what the player parts with', () => {
    const piece = item(baseFor('chest'));
    const character = hero({ inventory: [piece] });

    const sale = sellFromInventory(character, piece.uid);
    expect(sale).not.toBeNull();
    expect(sale!.gold).toBeGreaterThan(0);
    expect(sale!.character.currencies.gold).toBe(sale!.gold);
    expect(sale!.character.inventory).toHaveLength(0);
  });

  it('suggests the least valuable piece when the pack has to give', () => {
    const cheap = item(baseFor('helmet'), 'cheap');
    const dear: ItemInstance = { ...item(baseFor('chest'), 'dear'), budget: 10_000 };
    const character = hero({ inventory: [dear, cheap] });

    expect(leastValuable(character)?.uid).toBe(cheap.uid);
  });
});

describe('putting things on (Q15)', () => {
  it('moves a piece out of the pack and onto the hero', () => {
    const helmet = item(baseFor('helmet'));
    const character = hero({ inventory: [helmet] });

    const result = equipFromInventory(character, helmet.uid, INVENTORY_CAPACITY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.equipment.helmet?.uid).toBe(helmet.uid);
    expect(result.character.inventory).toHaveLength(0);
  });

  it('sends what was worn back to the pack rather than destroying it', () => {
    const worn = item(baseFor('helmet'), 'worn');
    const better = item(baseFor('helmet'), 'better');
    const character = hero({ inventory: [better], equipment: { helmet: worn } });

    const result = equipFromInventory(character, better.uid, INVENTORY_CAPACITY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.equipment.helmet?.uid).toBe(better.uid);
    expect(result.character.inventory.map((entry) => entry.uid)).toEqual([worn.uid]);
  });

  it('refuses a swap it has nowhere to put what comes off', () => {
    // A two-hander displaces *two* pieces — the old weapon and the shield — so a
    // pack that is exactly full has one slot too few. Losing either silently
    // would be the worst bug in the game (Q16).
    const twoHander = ITEM_BASES.find(
      (def) => def.classId === 'warrior' && def.weaponKind === 'two_handed',
    );
    if (!twoHander) throw new Error('the Warrior has no two-handed weapon');

    const greatsword = item(twoHander.id, 'gs-full');
    const filler = Array.from({ length: INVENTORY_CAPACITY - 1 }, (_, index) =>
      item(baseFor('chest'), `full${index}`),
    );
    const character = hero({
      equipment: {
        mainhand: item(baseFor('mainhand'), 'old-sword'),
        offhand: item(baseFor('offhand'), 'old-shield'),
      },
      inventory: [greatsword, ...filler],
    });

    const result = equipFromInventory(character, greatsword.uid, INVENTORY_CAPACITY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('backpackFull');
  });

  it('empties the offhand into the pack when a two-hander goes on (Q15)', () => {
    const shield = item(baseFor('offhand'), 'shield');
    const twoHander = ITEM_BASES.find(
      (def) => def.classId === 'warrior' && def.weaponKind === 'two_handed',
    );
    if (!twoHander) throw new Error('the Warrior has no two-handed weapon');

    const greatsword = item(twoHander.id, 'gs');
    const character = hero({ equipment: { offhand: shield }, inventory: [greatsword] });

    const result = equipFromInventory(character, greatsword.uid, INVENTORY_CAPACITY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.equipment.offhand).toBeUndefined();
    expect(result.character.inventory.map((entry) => entry.uid)).toContain(shield.uid);
  });

  it('says why it will not equip something, rather than going quiet', () => {
    const ring = ITEM_BASES.find((def) => def.slot === 'ring');
    if (!ring) throw new Error('no ring base');
    const trinket = item(ring.id, 'ring');
    const character = hero({ inventory: [trinket] });

    const result = equipFromInventory(character, trinket.uid, INVENTORY_CAPACITY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('slotLocked');
  });

  it('takes a piece off into the pack', () => {
    const helmet = item(baseFor('helmet'));
    const character = hero({ equipment: { helmet } });

    const result = unequip(character, 'helmet', INVENTORY_CAPACITY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.equipment.helmet).toBeUndefined();
    expect(result.character.inventory.map((entry) => entry.uid)).toEqual([helmet.uid]);
  });
});

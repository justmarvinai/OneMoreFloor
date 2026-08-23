import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { LOADOUT_PRESETS, STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { affixPool } from '@/content/items/affixPools.ts';
import { ITEM_BASES, requireItemDef } from '@/content/items/index.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { generateItem } from './generate.ts';
import { applyLoadout, captureLoadout, isEmptyLoadout, loadoutsOf } from './presets.ts';
import type { ItemInstance } from './types.ts';

const NOW = 1_700_000_000_000;
const BAG = STARTING_BACKPACK_SLOTS;

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'preset-test',
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
    rng: createRng(`preset:${defId}:${seed}`),
    uid: `preset-${defId}-${seed}`,
  });
}

function baseFor(slot: string): string {
  const def = ITEM_BASES.find(
    (candidate) =>
      candidate.slot === slot && (candidate.classId === null || candidate.classId === 'warrior'),
  );
  if (!def) throw new Error(`no base for ${slot}`);
  return def.id;
}

describe('saved gear sets (fifth polish round)', () => {
  it('shows a full shelf even to a hero who has saved nothing', () => {
    const shelf = loadoutsOf(hero({ loadouts: [] }));
    expect(shelf).toHaveLength(LOADOUT_PRESETS);
    expect(shelf.every(isEmptyLoadout)).toBe(true);
  });

  it('keeps what the hero is wearing, by uid rather than by copy', () => {
    const helmet = item(baseFor('helmet'));
    const saved = captureLoadout(hero({ equipment: { helmet } }), 0, 'Climbing');
    expect(typeof saved).not.toBe('string');
    if (typeof saved === 'string') return;

    expect(saved.loadouts[0]!.name).toBe('Climbing');
    expect(saved.loadouts[0]!.equipment.helmet).toBe(helmet.uid);
  });

  it('refuses to save a set from a hero wearing nothing, and says so', () => {
    expect(captureLoadout(hero({ equipment: {} }), 0, 'Naked')).toBe('nothingWorn');
  });

  it('puts a saved set back on, sending what it replaces to the pack', () => {
    const worn = item(baseFor('helmet'), 'worn');
    const spare = item(baseFor('helmet'), 'spare');

    const saved = captureLoadout(hero({ equipment: { helmet: worn } }), 0, 'A');
    if (typeof saved === 'string') throw new Error(saved);

    // Swap by hand, then ask for the set back.
    const swapped: Character = {
      ...saved,
      equipment: { helmet: spare },
      inventory: [worn],
    };

    const result = applyLoadout(swapped, 0, BAG);
    if (typeof result === 'string') throw new Error(result);

    expect(result.character.equipment.helmet?.uid).toBe(worn.uid);
    expect(result.character.inventory.map((entry) => entry.uid)).toEqual([spare.uid]);
    expect(result.missing).toBe(0);
  });

  it('skips the pieces that are gone rather than refusing the whole set', () => {
    const helmet = item(baseFor('helmet'), 'kept');
    const chest = item(baseFor('chest'), 'sold');

    const saved = captureLoadout(hero({ equipment: { helmet, chest } }), 0, 'A');
    if (typeof saved === 'string') throw new Error(saved);

    // The chest piece was sold: it exists in the preset and nowhere else.
    const afterSale: Character = { ...saved, equipment: {}, inventory: [helmet] };
    const result = applyLoadout(afterSale, 0, BAG);
    if (typeof result === 'string') throw new Error(result);

    expect(result.character.equipment.helmet?.uid).toBe(helmet.uid);
    expect(result.character.equipment.chest).toBeUndefined();
    expect(result.missing).toBe(1);
  });

  it('says no rather than doing nothing when the set is already worn', () => {
    const helmet = item(baseFor('helmet'));
    const saved = captureLoadout(hero({ equipment: { helmet } }), 0, 'A');
    if (typeof saved === 'string') throw new Error(saved);

    expect(applyLoadout(saved, 0, BAG)).toBe('alreadyWorn');
  });

  it('says no when there is nowhere to put what comes off', () => {
    const worn = item(baseFor('helmet'), 'worn');
    const spare = item(baseFor('helmet'), 'spare');

    const saved = captureLoadout(hero({ equipment: { helmet: worn } }), 0, 'A');
    if (typeof saved === 'string') throw new Error(saved);

    // The set's helmet is in a bag that is exactly full; swapping it for the
    // worn one is a straight trade, so the tight case is a *two*-piece set
    // pulling one piece out of a full bag while pushing nothing back in.
    const filler = Array.from({ length: 2 }, (_, index) => item(baseFor('chest'), `f${index}`));
    const cramped: Character = {
      ...saved,
      equipment: { helmet: spare },
      inventory: [worn, ...filler],
    };

    expect(applyLoadout(cramped, 0, 2)).toBe('backpackFull');
  });

  it('refuses an empty preset in words, not in silence', () => {
    expect(applyLoadout(hero(), 0, BAG)).toBe('empty');
    expect(applyLoadout(hero(), 99, BAG)).toBe('noSuchPreset');
  });

  it('resolves the weapon before the offhand, so a two-hander clears the shield', () => {
    const twoHander = ITEM_BASES.find(
      (def) => def.classId === 'warrior' && def.weaponKind === 'two_handed',
    );
    if (!twoHander) throw new Error('the Warrior has no two-handed weapon');

    const greatsword = item(twoHander.id, 'gs');
    const shield = item(baseFor('offhand'), 'shield');

    // A set naming both: the offhand cannot survive the two-hander (Q15), so it
    // is reported missing rather than worn beside a weapon that fills the slot.
    const character: Character = {
      ...hero({ inventory: [greatsword, shield] }),
      loadouts: [
        { name: 'Both', equipment: { mainhand: greatsword.uid, offhand: shield.uid } },
        { name: '', equipment: {} },
        { name: '', equipment: {} },
      ],
    };

    const result = applyLoadout(character, 0, BAG);
    if (typeof result === 'string') throw new Error(result);

    expect(result.character.equipment.mainhand?.uid).toBe(greatsword.uid);
    expect(result.character.equipment.offhand).toBeUndefined();
    expect(result.missing).toBe(1);
  });
});

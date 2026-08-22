/**
 * Item content validation — part of `npm run content:validate`.
 *
 * The checks CONTENT_PIPELINE §1.4 calls for: schema conformance, id uniqueness,
 * and no dangling references from content into strings or artwork. A missing
 * icon or a renamed string should fail the build, not ship as a blank square.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_IDS, EQUIP_SLOT_IDS, type ClassId } from '@/domain/character/types.ts';
import { startingLoadoutFor } from '@/domain/items/starting.ts';
import { en } from '@/strings/en.ts';
import { AFFIX_POOLS } from './affixPools.ts';
import { ITEM_BASES, defsForSlot, getItemDef, requireItemDef } from './index.ts';
import { MATERIALS, materialForTier, materialIdForTier } from './materials.ts';

const FUI_ROOT = path.resolve(import.meta.dirname, '../../../public/fui');

/** Every art id the library ships, from the vendored packs themselves. */
const AVAILABLE_ART = new Set(
  ['spell-icons', 'line-glyphs', 'stone-vine', 'dark-ember', 'deco-frames'].flatMap((pack) => {
    try {
      return readdirSync(path.join(FUI_ROOT, pack)).map((file) =>
        file.replace(/\.[a-z0-9]+$/i, ''),
      );
    } catch {
      return [];
    }
  }),
);

describe('item bases', () => {
  it('has a unique id for every base', () => {
    const ids = ITEM_BASES.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only strings that exist', () => {
    for (const def of ITEM_BASES) {
      expect(en[def.nameKey as keyof typeof en], `${def.id}: missing ${def.nameKey}`).toBeTypeOf(
        'string',
      );
    }
  });

  it('references only artwork that ships with the build', () => {
    for (const def of ITEM_BASES) {
      expect(AVAILABLE_ART, `${def.id}: missing icon ${def.icon}`).toContain(def.icon);
    }
  });

  it('uses a real slot and a real affix pool', () => {
    for (const def of ITEM_BASES) {
      expect(EQUIP_SLOT_IDS).toContain(def.slot);
      expect(Object.keys(AFFIX_POOLS)).toContain(def.affixPool);
    }
  });

  it('gives every base a sane bracket range', () => {
    for (const def of ITEM_BASES) {
      const [min, max] = def.brackets;
      expect(min, def.id).toBeGreaterThanOrEqual(0);
      expect(max, def.id).toBeGreaterThan(min);
    }
  });

  it('marks weapons with a weapon kind and armour without one', () => {
    for (const def of ITEM_BASES) {
      const isWeaponSlot = def.slot === 'mainhand' || def.slot === 'offhand';
      if (isWeaponSlot) {
        expect(def.weaponKind, `${def.id} should declare a weapon kind`).toBeDefined();
        // Weapons are class-exclusive (Brief §8.2).
        expect(def.classId, `${def.id} should belong to a class`).not.toBeNull();
      } else {
        expect(def.weaponKind, `${def.id} should not have a weapon kind`).toBeUndefined();
        expect(def.classId, `${def.id} should fit every class`).toBeNull();
      }
    }
  });

  it('covers every equipment slot', () => {
    for (const slot of EQUIP_SLOT_IDS) {
      const forSlot = ITEM_BASES.filter((def) => def.slot === slot);
      expect(forSlot.length, `no bases for ${slot}`).toBeGreaterThan(0);
    }
  });

  it('gives every class a weapon for every hand it can fill (Q15)', () => {
    const expectations: Record<ClassId, ('mainhand' | 'offhand')[]> = {
      warrior: ['mainhand', 'offhand'],
      mage: ['mainhand'],
      hunter: ['mainhand'],
      bard: ['mainhand'],
      swashbuckler: ['mainhand', 'offhand'],
    };

    for (const classId of CLASS_IDS) {
      for (const slot of expectations[classId]) {
        const options = defsForSlot(slot, classId).filter((def) => def.classId === classId);
        expect(options.length, `${classId} has no ${slot} weapon`).toBeGreaterThan(0);
      }
    }
  });

  it('gives no class a weapon belonging to another', () => {
    for (const classId of CLASS_IDS) {
      const weapons = defsForSlot('mainhand', classId);
      for (const weapon of weapons) {
        expect(weapon.classId === null || weapon.classId === classId).toBe(true);
      }
    }
  });

  it('looks bases up by id, and fails loudly on an unknown one', () => {
    expect(getItemDef(ITEM_BASES[0].id)).toBe(ITEM_BASES[0]);
    expect(getItemDef('item.nope')).toBeUndefined();
    expect(() => requireItemDef('item.nope')).toThrow(/unknown item definition/);
  });
});

describe('affix pools', () => {
  it('gives every pool at least three stats to draw from', () => {
    for (const [id, weights] of Object.entries(AFFIX_POOLS)) {
      const usable = Object.values(weights).filter((weight) => (weight ?? 0) > 0);
      expect(usable.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps Speed available only through gear, and on most pools (§6)', () => {
    // Speed has no other source in the game, so gear pools must actually offer it.
    const withSpeed = Object.values(AFFIX_POOLS).filter((weights) => (weights.speed ?? 0) > 0);
    expect(withSpeed.length).toBe(Object.keys(AFFIX_POOLS).length);
  });

  it('splits the accessory pools the way Q5 decided', () => {
    const offense = AFFIX_POOLS.accessory_offense;
    const defense = AFFIX_POOLS.accessory_defense;

    // Necklace leans offensive, Amulet leans defensive.
    expect((offense.strength ?? 0) + (offense.luck ?? 0) + (offense.speed ?? 0)).toBeGreaterThan(
      (offense.hp ?? 0) + (offense.defense ?? 0),
    );
    expect((defense.hp ?? 0) + (defense.defense ?? 0) + (defense.resource ?? 0)).toBeGreaterThan(
      (defense.strength ?? 0) + (defense.luck ?? 0) + (defense.speed ?? 0),
    );
  });
});

describe('materials', () => {
  it('has a unique id and a real string for each', () => {
    const ids = MATERIALS.map((material) => material.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const material of MATERIALS) {
      expect(en[material.nameKey as keyof typeof en], material.id).toBeTypeOf('string');
      expect(AVAILABLE_ART, `${material.id}: missing icon`).toContain(material.icon);
    }
  });

  it('defines one material per consecutive tier', () => {
    const tiers = MATERIALS.map((material) => material.tier).sort((a, b) => a - b);
    expect(tiers).toEqual(tiers.map((_, index) => index));
  });

  it('clamps rather than failing outside the authored tiers', () => {
    expect(materialForTier(-3).tier).toBe(0);
    expect(materialForTier(999).tier).toBe(MATERIALS.length - 1);
    expect(materialIdForTier(0)).toBe(MATERIALS[0].id);
  });
});

describe('starting loadouts (Brief §5, Q15)', () => {
  it('arms every class with exactly what Q15 decided', () => {
    expect(startingLoadoutFor('warrior').map((def) => def.weaponKind)).toEqual([
      'one_handed',
      'shield',
    ]);
    expect(startingLoadoutFor('swashbuckler').map((def) => def.weaponKind)).toEqual([
      'one_handed',
      'one_handed',
    ]);
    for (const classId of ['mage', 'hunter', 'bard'] as const) {
      expect(
        startingLoadoutFor(classId).map((def) => def.weaponKind),
        classId,
      ).toEqual(['two_handed']);
    }
  });

  it('gives every class only weapons, so every other slot starts empty (§5)', () => {
    for (const classId of CLASS_IDS) {
      for (const def of startingLoadoutFor(classId)) {
        expect(['mainhand', 'offhand'], `${classId}: ${def.id}`).toContain(def.slot);
        expect(def.classId, `${classId}: ${def.id} belongs to another class`).toBe(classId);
      }
    }
  });

  it('starts everyone at the shallowest bracket', () => {
    for (const classId of CLASS_IDS) {
      for (const def of startingLoadoutFor(classId)) {
        expect(def.brackets[0], `${classId}: ${def.id}`).toBe(0);
      }
    }
  });
});

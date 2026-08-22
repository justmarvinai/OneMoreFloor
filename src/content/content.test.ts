/**
 * Content validation — what `npm run content:validate` runs in CI.
 *
 * This is the guard described in CONTENT_PIPELINE §1.4: schema conformance, id
 * uniqueness, and no dangling references from content into strings or art. It
 * grows with the content it validates; enemies, floors, items and quests each add
 * their checks here as they land.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_LIST, getClass, isClassId } from './classes/index.ts';
import {
  ASCENSION_STEPS,
  BASE_EQUIP_SLOTS,
  BATTLE_SPEED_MULTIPLIERS,
  MAX_ASCENSION,
  MAX_CHARACTER_SLOTS,
} from './balance/progression.ts';
import { CLASS_IDS, EQUIP_SLOT_IDS } from '@/domain/character/types.ts';
import { UPGRADABLE_STAT_IDS } from '@/domain/stats.ts';
import { en } from '@/strings/en.ts';

const ART_DIR = path.resolve(import.meta.dirname, '../../public/art/classes');

describe('classes', () => {
  it('has exactly the five classes the brief allows (§2.2/§8)', () => {
    expect(CLASS_LIST).toHaveLength(5);
    expect(CLASS_LIST.map((definition) => definition.id)).toEqual([...CLASS_IDS]);
  });

  it('registers every class under its own id', () => {
    for (const [key, definition] of Object.entries(CLASSES)) {
      expect(definition.id).toBe(key);
      expect(getClass(definition.id)).toBe(definition);
    }
  });

  it('references only string keys that exist', () => {
    // A renamed or forgotten string would otherwise ship as a blank label.
    for (const definition of CLASS_LIST) {
      const keys = [
        definition.nameKey,
        definition.taglineKey,
        definition.descriptionKey,
        definition.weaponDescriptionKey,
        definition.resource.nameKey,
        definition.resource.fillDescriptionKey,
        definition.signature.nameKey,
        definition.signature.descriptionKey,
      ];
      for (const key of keys) {
        expect(en[key], `${definition.id}: missing string ${key}`).toBeTypeOf('string');
        expect(en[key].length, `${definition.id}: empty string ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('binds portrait art that actually exists on disk', () => {
    const files = new Set(readdirSync(ART_DIR));
    for (const definition of CLASS_LIST) {
      // Portrait ids are registered as CSS custom properties in src/styles/art.css;
      // the id maps to `<class>.webp` produced by `npm run art:optimize`.
      expect(definition.art.portrait).toBe(`class-${definition.id}`);
      expect(files, `${definition.id}: missing portrait`).toContain(`${definition.id}.webp`);
    }
  });

  it('uses line glyphs for every class mark and signature move', () => {
    for (const definition of CLASS_LIST) {
      expect(definition.art.glyph).toMatch(/^glyph-/);
      expect(definition.signature.glyph).toMatch(/^glyph-/);
    }
  });

  it('gives every class a full stat profile with no Speed (§6)', () => {
    for (const definition of CLASS_LIST) {
      for (const stat of UPGRADABLE_STAT_IDS) {
        expect(definition.baseStats[stat], `${definition.id}: base ${stat}`).toBeGreaterThan(0);
        expect(
          definition.statGrowthPerLevel[stat],
          `${definition.id}: growth ${stat}`,
        ).toBeGreaterThan(0);
      }
      // Speed is gear-only: it is not merely zero here, it is unrepresentable.
      expect(Object.keys(definition.baseStats)).not.toContain('speed');
      expect(Object.keys(definition.statGrowthPerLevel)).not.toContain('speed');
    }
  });

  it('keeps starting power comparable across the roster', () => {
    // Classes differ by shape, not by raw strength (Brief §8: real upsides *and*
    // downsides). A wildly cheaper or richer class here is a balance bug.
    const budgets = CLASS_LIST.map(
      (definition) =>
        definition.baseStats.strength * 4 +
        definition.baseStats.defense * 4 +
        definition.baseStats.hp * 0.5 +
        definition.baseStats.resource * 2 +
        definition.baseStats.luck * 2,
    );
    const spread = Math.max(...budgets) / Math.min(...budgets);
    expect(spread).toBeLessThan(1.2);
  });

  it('covers all three resource kinds across the roster', () => {
    const kinds = new Set(CLASS_LIST.map((definition) => definition.resource.kind));
    expect([...kinds].sort()).toEqual(['focus', 'mana', 'rage']);
  });

  it('gives the Warrior the only shield-capable loadout (Q15)', () => {
    expect(getClass('warrior').weaponRule).toBe('one_hand_shield_or_two_handed');
    expect(getClass('swashbuckler').weaponRule).toBe('dual_one_handed');
    for (const id of ['mage', 'hunter', 'bard'] as const) {
      expect(getClass(id).weaponRule).toBe('two_handed');
    }
  });

  it('narrows untrusted values to real class ids', () => {
    expect(isClassId('warrior')).toBe(true);
    expect(isClassId('necromancer')).toBe(false);
    expect(isClassId(42)).toBe(false);
    expect(isClassId(null)).toBe(false);
  });

  it('authors one file per class plus the shared modules', () => {
    const files = readdirSync(path.resolve(import.meta.dirname, 'classes'))
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => !['index.ts', 'types.ts'].includes(file));
    expect(files.sort()).toEqual(CLASS_IDS.map((id) => `${id}.ts`).sort());
  });
});

describe('progression tables', () => {
  it('matches the ascension table in the brief (§7)', () => {
    expect(ASCENSION_STEPS.map((step) => step.levelCap)).toEqual([
      100,
      250,
      500,
      750,
      1000,
      Infinity,
    ]);
    expect(ASCENSION_STEPS.map((step) => step.unlocksSlot)).toEqual([
      null,
      'ring',
      'necklace',
      'amulet',
      'relic',
      'artifact',
    ]);
  });

  it('indexes steps by tier and stops at the maximum', () => {
    ASCENSION_STEPS.forEach((step, index) => expect(step.tier).toBe(index));
    expect(ASCENSION_STEPS.at(-1)?.tier).toBe(MAX_ASCENSION);
  });

  it('raises the level cap monotonically', () => {
    for (let i = 1; i < ASCENSION_STEPS.length; i += 1) {
      expect(ASCENSION_STEPS[i].levelCap).toBeGreaterThan(ASCENSION_STEPS[i - 1].levelCap);
    }
  });

  it('unlocks each ascension slot exactly once, and never a base slot', () => {
    const unlocked = ASCENSION_STEPS.map((step) => step.unlocksSlot).filter(
      (slot): slot is NonNullable<typeof slot> => slot !== null,
    );
    expect(new Set(unlocked).size).toBe(unlocked.length);
    for (const slot of unlocked) expect(BASE_EQUIP_SLOTS).not.toContain(slot);
  });

  it('accounts for every equipment slot across base and ascension unlocks', () => {
    const all = [
      ...BASE_EQUIP_SLOTS,
      ...ASCENSION_STEPS.flatMap((step) => (step.unlocksSlot ? [step.unlocksSlot] : [])),
    ];
    expect(all.sort()).toEqual([...EQUIP_SLOT_IDS].sort());
  });

  it('caps character slots at five (§15.2)', () => {
    expect(MAX_CHARACTER_SLOTS).toBe(5);
  });

  it('tops battle speed out at x8 (§15.1, Q19)', () => {
    expect(BATTLE_SPEED_MULTIPLIERS).toEqual([1, 2, 4, 8]);
  });
});

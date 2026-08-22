import { describe, expect, it } from 'vitest';
import { requireItemDef } from '@/content/items/index.ts';
import type { AscensionTier, ClassId } from '../character/types.ts';
import { availableSlots, canEquip, isOffhandBlocked, slotsDisplacedBy } from './equip.ts';

const GREATSWORD = requireItemDef('item.mainhand.warrior-greatsword');
const ARMING_SWORD = requireItemDef('item.mainhand.warrior-arming-sword');
const SHIELD = requireItemDef('item.offhand.warrior-warded-shield');
const STAFF = requireItemDef('item.mainhand.mage-apprentice-staff');
const BOW = requireItemDef('item.mainhand.hunter-hunting-bow');
const DAGGER = requireItemDef('item.mainhand.swash-jade-dagger');
const OFFHAND_DAGGER = requireItemDef('item.offhand.swash-parrying-dagger');
const CHEST = requireItemDef('item.chest.scale-cuirass');
const RING = requireItemDef('item.ring.arcane-band');

function context(classId: ClassId, ascension: AscensionTier = 0, mainhand = null) {
  return { classId, ascension, mainhand };
}

describe('slot availability (Brief §7/§9.1)', () => {
  it('opens the nine base slots at ascension 0', () => {
    expect(availableSlots(0)).toHaveLength(9);
    expect(availableSlots(0)).toContain('mainhand');
    expect(availableSlots(0)).not.toContain('ring');
  });

  it('adds one slot per ascension tier', () => {
    expect(availableSlots(1)).toContain('ring');
    expect(availableSlots(4)).toContain('relic');
    expect(availableSlots(5)).toHaveLength(14);
  });

  it('refuses an accessory whose slot has not been unlocked yet', () => {
    expect(canEquip(RING, 'ring', context('warrior', 0))).toEqual({
      ok: false,
      reason: 'slotLocked',
    });
    expect(canEquip(RING, 'ring', context('warrior', 1))).toEqual({ ok: true });
  });
});

describe('armour and accessories are universal (Brief §8.2)', () => {
  it('fits every class', () => {
    for (const classId of ['warrior', 'mage', 'hunter', 'bard', 'swashbuckler'] as const) {
      expect(canEquip(CHEST, 'chest', context(classId)), classId).toEqual({ ok: true });
    }
  });

  it('still refuses the wrong slot', () => {
    expect(canEquip(CHEST, 'helmet', context('warrior'))).toEqual({
      ok: false,
      reason: 'wrongSlot',
    });
  });
});

describe('weapons are class-exclusive (Brief §8.2)', () => {
  it('refuses another class’s weapon', () => {
    expect(canEquip(STAFF, 'mainhand', context('warrior'))).toEqual({
      ok: false,
      reason: 'wrongClass',
    });
    expect(canEquip(GREATSWORD, 'mainhand', context('mage'))).toEqual({
      ok: false,
      reason: 'wrongClass',
    });
  });

  it('accepts a class’s own weapon', () => {
    expect(canEquip(STAFF, 'mainhand', context('mage'))).toEqual({ ok: true });
    expect(canEquip(BOW, 'mainhand', context('hunter'))).toEqual({ ok: true });
  });
});

describe('weapon loadouts (Brief §8.1, Q15)', () => {
  it('lets the Warrior choose between a two-hander and blade-and-board', () => {
    expect(canEquip(GREATSWORD, 'mainhand', context('warrior'))).toEqual({ ok: true });
    expect(canEquip(ARMING_SWORD, 'mainhand', context('warrior'))).toEqual({ ok: true });
    expect(canEquip(SHIELD, 'offhand', context('warrior'))).toEqual({ ok: true });
  });

  it('blocks the Warrior’s offhand while a two-hander is held', () => {
    expect(canEquip(SHIELD, 'offhand', { ...context('warrior'), mainhand: GREATSWORD })).toEqual({
      ok: false,
      reason: 'offhandBlocked',
    });
  });

  it('never frees the offhand for a two-handed class', () => {
    // Mage, Hunter and Bard: the slot is occupied by their weapon, not empty.
    for (const classId of ['mage', 'hunter', 'bard'] as const) {
      expect(canEquip(SHIELD, 'offhand', context(classId)).ok, classId).toBe(false);
      expect(canEquip(OFFHAND_DAGGER, 'offhand', context(classId)).ok, classId).toBe(false);
    }
  });

  it('gives the Swashbuckler a weapon in each hand', () => {
    expect(canEquip(DAGGER, 'mainhand', context('swashbuckler'))).toEqual({ ok: true });
    expect(canEquip(OFFHAND_DAGGER, 'offhand', context('swashbuckler'))).toEqual({ ok: true });
  });

  it('refuses a two-hander to a dual-wielding class', () => {
    // No greatsword-wielding Swashbuckler, even though it is a melee weapon.
    const swashTwoHander = { ...GREATSWORD, classId: 'swashbuckler' as ClassId };
    expect(canEquip(swashTwoHander, 'mainhand', context('swashbuckler'))).toEqual({
      ok: false,
      reason: 'wrongWeaponKind',
    });
  });

  it('gives the shield to the Warrior alone', () => {
    const swashShield = { ...SHIELD, classId: 'swashbuckler' as ClassId };
    expect(canEquip(swashShield, 'offhand', context('swashbuckler'))).toEqual({
      ok: false,
      reason: 'wrongWeaponKind',
    });
  });
});

describe('offhand displacement', () => {
  it('knows when a two-hander occupies the offhand', () => {
    expect(isOffhandBlocked(GREATSWORD)).toBe(true);
    expect(isOffhandBlocked(ARMING_SWORD)).toBe(false);
    expect(isOffhandBlocked(null)).toBe(false);
  });

  it('reports the offhand as displaced when a two-hander is equipped', () => {
    expect(slotsDisplacedBy(GREATSWORD, 'mainhand')).toEqual(['offhand']);
    expect(slotsDisplacedBy(ARMING_SWORD, 'mainhand')).toEqual([]);
    expect(slotsDisplacedBy(CHEST, 'chest')).toEqual([]);
  });
});

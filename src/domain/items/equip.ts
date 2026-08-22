/**
 * Equip rules (Brief §8.1, §8.2, §9.1; Q15).
 *
 * Two rules from the brief do the heavy lifting: **armour and accessories fit
 * every class, weapons fit exactly one** (§8.2), and each class holds its weapons
 * a particular way (§8.1). The third comes from ascension: five slots do not
 * exist yet for most characters (§7).
 *
 * Every refusal here carries a reason, because a slot that goes quietly grey is
 * a slot the player has to guess about.
 */
import { getClass } from '@/content/classes/index.ts';
import { unlockedSlotsAt } from '../character/character.ts';
import { BASE_EQUIP_SLOTS } from '@/content/balance/progression.ts';
import type { AscensionTier, ClassId, EquipSlotId } from '../character/types.ts';
import type { ItemDef } from './types.ts';

export type EquipRefusal =
  /** The slot itself is not unlocked at this ascension tier (Brief §7). */
  | 'slotLocked'
  /** A weapon belonging to another class (Brief §8.2). */
  | 'wrongClass'
  /** This class cannot hold that kind of weapon in that hand (Brief §8.1). */
  | 'wrongWeaponKind'
  /** The offhand is occupied by a two-handed weapon (Q15). */
  | 'offhandBlocked'
  /** The item does not belong in this slot at all. */
  | 'wrongSlot';

export type EquipCheck = { ok: true } | { ok: false; reason: EquipRefusal };

const OK: EquipCheck = { ok: true };

/** Slots a character can use at their ascension tier (Brief §7/§9.1). */
export function availableSlots(ascension: AscensionTier): EquipSlotId[] {
  return [...BASE_EQUIP_SLOTS, ...unlockedSlotsAt(ascension)];
}

/**
 * Whether the offhand is usable, given what is in the mainhand.
 *
 * A two-handed weapon *occupies* the offhand rather than leaving it empty (Q15):
 * an empty slot invites the player to fill it, and this one never can be.
 */
export function isOffhandBlocked(mainhand: ItemDef | null): boolean {
  return mainhand?.weaponKind === 'two_handed';
}

export interface EquipContext {
  classId: ClassId;
  ascension: AscensionTier;
  /** What is currently in the mainhand, for offhand decisions. */
  mainhand?: ItemDef | null;
}

/** Can this item go in this slot for this character? */
export function canEquip(def: ItemDef, slot: EquipSlotId, context: EquipContext): EquipCheck {
  if (def.slot !== slot) return { ok: false, reason: 'wrongSlot' };

  if (!availableSlots(context.ascension).includes(slot)) {
    return { ok: false, reason: 'slotLocked' };
  }

  // Armour and accessories: universal by design (Brief §8.2).
  if (def.classId !== null && def.classId !== context.classId) {
    return { ok: false, reason: 'wrongClass' };
  }

  if (slot === 'mainhand') return checkMainhand(def, context.classId);
  if (slot === 'offhand') return checkOffhand(def, context);

  return OK;
}

function checkMainhand(def: ItemDef, classId: ClassId): EquipCheck {
  const rule = getClass(classId).weaponRule;
  const kind = def.weaponKind;

  switch (rule) {
    case 'two_handed':
      // Mage, Hunter and Bard carry one thing, in both hands.
      return kind === 'two_handed' ? OK : { ok: false, reason: 'wrongWeaponKind' };
    case 'one_hand_shield_or_two_handed':
      // The Warrior's choice: a great weapon, or a blade and a shield.
      return kind === 'two_handed' || kind === 'one_handed'
        ? OK
        : { ok: false, reason: 'wrongWeaponKind' };
    case 'dual_one_handed':
      return kind === 'one_handed' ? OK : { ok: false, reason: 'wrongWeaponKind' };
  }
}

function checkOffhand(def: ItemDef, context: EquipContext): EquipCheck {
  if (isOffhandBlocked(context.mainhand ?? null)) {
    return { ok: false, reason: 'offhandBlocked' };
  }

  const rule = getClass(context.classId).weaponRule;
  const kind = def.weaponKind;

  switch (rule) {
    case 'two_handed':
      // Their weapon always takes both hands, so the offhand is never free.
      return { ok: false, reason: 'offhandBlocked' };
    case 'one_hand_shield_or_two_handed':
      // Shields are the Warrior's alone (Q15).
      return kind === 'shield' ? OK : { ok: false, reason: 'wrongWeaponKind' };
    case 'dual_one_handed':
      return kind === 'one_handed' ? OK : { ok: false, reason: 'wrongWeaponKind' };
  }
}

/**
 * Equipping into the mainhand can invalidate what is in the offhand — picking up
 * a greatsword puts your shield away. Returns the slots that must be emptied.
 */
export function slotsDisplacedBy(def: ItemDef, slot: EquipSlotId): EquipSlotId[] {
  if (slot === 'mainhand' && def.weaponKind === 'two_handed') return ['offhand'];
  return [];
}

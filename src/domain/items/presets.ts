/**
 * Saved gear sets (fifth polish round).
 *
 * A hero owns more than one good answer: the set that clears floors fastest is
 * rarely the set that survives a gatekeeper, and swapping eight pieces by hand
 * every ten floors is the kind of tax that makes players stop swapping at all.
 * A preset is that decision, kept.
 *
 * It stores **uids, not items** — a preset is a list of *which pieces*, so a
 * piece that gets levelled or ascended after the set was saved comes back
 * improved rather than as the snapshot it was. It is also why a preset can go
 * stale: sell a piece and its slot is simply missing when the set is worn, which
 * the caller reports rather than silently filling with something else.
 *
 * The file is `presets.ts` rather than `loadouts.ts` because `loadout.ts` next
 * door already owns equipping and unequipping one piece; two files a letter
 * apart would be a trap for whoever reads this next.
 *
 * Applying is written as one whole-state swap rather than a loop of equips.
 * A loop trips over its own ordering — put the two-hander on before taking the
 * shield off and the shield's slot refuses — and can run the backpack out of
 * room half way through, leaving the hero in a set nobody asked for.
 */
import { LOADOUT_PRESETS } from '@/content/balance/account.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { EQUIP_SLOT_IDS } from '../character/types.ts';
import type { Character, EquipSlotId, Loadout } from '../character/types.ts';
import { availableSlots, canEquip } from './equip.ts';
import type { ItemInstance } from './types.ts';

export { LOADOUT_PRESETS };

/** The empty shelf a new hero starts with — three slots, all unset. */
export function emptyLoadouts(): Loadout[] {
  return Array.from({ length: LOADOUT_PRESETS }, () => ({ name: '', equipment: {} }));
}

/** True when nothing has been saved into this preset yet. */
export function isEmptyLoadout(loadout: Loadout | undefined): boolean {
  return !loadout || Object.keys(loadout.equipment).length === 0;
}

export type CaptureRefusal = 'noSuchPreset' | 'nothingWorn';

/**
 * Save what the hero is wearing into a preset.
 *
 * The name is whatever the player typed and nothing else: a name the game
 * invents would be English text living in a save file, which is exactly what
 * `src/strings/` exists to prevent (Q24). An unnamed preset is stored unnamed
 * and labelled by the screen.
 */
export function captureLoadout(
  character: Character,
  index: number,
  name: string,
): Character | CaptureRefusal {
  if (index < 0 || index >= LOADOUT_PRESETS) return 'noSuchPreset';

  const equipment: Partial<Record<EquipSlotId, string>> = {};
  for (const slot of EQUIP_SLOT_IDS) {
    const worn = character.equipment[slot];
    if (worn) equipment[slot] = worn.uid;
  }
  if (Object.keys(equipment).length === 0) return 'nothingWorn';

  const loadouts = shelf(character);
  loadouts[index] = { name: name.trim().slice(0, LOADOUT_NAME_MAX), equipment };
  return { ...character, loadouts };
}

/** As long as a hero's name, for the same reason: it has to fit on a card. */
export const LOADOUT_NAME_MAX = 16;

export type ApplyRefusal = 'noSuchPreset' | 'empty' | 'alreadyWorn' | 'backpackFull';

export interface ApplyResult {
  character: Character;
  /** Pieces the preset asked for that the hero no longer owns or cannot wear. */
  missing: number;
}

/**
 * Wear a preset.
 *
 * Mainhand first, because the two-handed rule reads whatever is *going* to be in
 * the mainhand rather than what is in it now — resolve the weapon and the
 * offhand's answer is the one the finished set deserves.
 */
export function applyLoadout(
  character: Character,
  index: number,
  capacity: number,
): ApplyResult | ApplyRefusal {
  const preset = shelf(character)[index];
  if (!preset) return 'noSuchPreset';
  if (isEmptyLoadout(preset)) return 'empty';

  const owned = new Map<string, ItemInstance>();
  for (const item of character.inventory) owned.set(item.uid, item);
  for (const slot of EQUIP_SLOT_IDS) {
    const worn = character.equipment[slot];
    if (worn) owned.set(worn.uid, worn);
  }

  const unlocked = new Set(availableSlots(character.progression.ascension));
  const target: Partial<Record<EquipSlotId, ItemInstance>> = {};
  let missing = 0;

  for (const slot of WEAPON_FIRST) {
    const uid = preset.equipment[slot];
    if (uid === undefined) continue;

    const item = owned.get(uid);
    if (!item || !unlocked.has(slot)) {
      missing += 1;
      continue;
    }

    const mainhand = target.mainhand;
    const check = canEquip(requireItemDef(item.defId), slot, {
      classId: character.identity.classId,
      ascension: character.progression.ascension,
      mainhand: mainhand ? requireItemDef(mainhand.defId) : null,
    });
    if (!check.ok) {
      missing += 1;
      continue;
    }
    target[slot] = item;
  }

  if (sameAsWorn(character, target)) return 'alreadyWorn';

  const wanted = new Set(Object.values(target).map((item) => item.uid));
  const kept = character.inventory.filter((item) => !wanted.has(item.uid));
  const removed = EQUIP_SLOT_IDS.map((slot) => character.equipment[slot]).filter(
    (item): item is ItemInstance => item !== undefined && !wanted.has(item.uid),
  );

  // Checked once, on the finished set, so a swap either happens whole or not at
  // all — never half of one set and half of another (Q16).
  const inventory = [...kept, ...removed];
  if (inventory.length > capacity) return 'backpackFull';

  return { character: { ...character, equipment: target, inventory }, missing };
}

/** Mainhand before offhand; the rest in their own order — it does not matter. */
const WEAPON_FIRST: readonly EquipSlotId[] = [
  'mainhand',
  ...EQUIP_SLOT_IDS.filter((slot) => slot !== 'mainhand'),
];

function sameAsWorn(
  character: Character,
  target: Partial<Record<EquipSlotId, ItemInstance>>,
): boolean {
  return EQUIP_SLOT_IDS.every(
    (slot) => character.equipment[slot]?.uid === (target[slot]?.uid ?? undefined),
  );
}

/**
 * The shelf, always the configured length.
 *
 * A save written before this feature has none, and one written when the count
 * changes has the old number; padding here rather than in a migration means the
 * count is a single constant that nothing else has to be told about.
 */
function shelf(character: Character): Loadout[] {
  const held = character.loadouts ?? [];
  return Array.from({ length: LOADOUT_PRESETS }, (_, index) => {
    const found = held[index];
    return found
      ? { name: found.name, equipment: { ...found.equipment } }
      : { name: '', equipment: {} };
  });
}

/** The shelf as the screen should draw it — always three, oldest data padded. */
export function loadoutsOf(character: Character): Loadout[] {
  return shelf(character);
}

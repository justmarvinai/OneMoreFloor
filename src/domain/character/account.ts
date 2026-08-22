/**
 * Account rules — slots, switching and reset.
 *
 * Per Q4 the account is what *survives*: its upgrades are bought once for every
 * slot and a character reset never touches them. Per Q2 exactly one character is
 * active at a time; switching is an explicit act, not something that happens
 * behind the player's back.
 */
import { MAX_CHARACTER_SLOTS, STARTING_CHARACTER_SLOTS } from '@/content/balance/progression.ts';
import { SLOT_IDS, type Account, type SlotId } from './types.ts';

export function createAccount(): Account {
  return {
    battleSpeedTier: 0,
    slotsUnlocked: STARTING_CHARACTER_SLOTS,
    activeSlotId: null,
    tutorialCompleted: false,
  };
}

export type SlotState =
  /** Unlocked and holding a character. */
  | 'occupied'
  /** Unlocked and empty — a hero can be created here. */
  | 'empty'
  /** Not yet bought (Brief §15.2). */
  | 'locked';

export function slotState(account: Account, slotId: SlotId, occupied: boolean): SlotState {
  if (slotId > account.slotsUnlocked) return 'locked';
  return occupied ? 'occupied' : 'empty';
}

/** Every slot with its current state, in display order. */
export function slotStates(
  account: Account,
  occupiedSlots: readonly SlotId[],
): Array<{ slotId: SlotId; state: SlotState }> {
  return SLOT_IDS.map((slotId) => ({
    slotId,
    state: slotState(account, slotId, occupiedSlots.includes(slotId)),
  }));
}

export function canUnlockAnotherSlot(account: Account): boolean {
  return account.slotsUnlocked < MAX_CHARACTER_SLOTS;
}

/**
 * Unlock the next slot. The *price* and where the gold comes from belong to the
 * account-upgrades screen in M6; this is only the state change.
 */
export function unlockNextSlot(account: Account): Account {
  if (!canUnlockAnotherSlot(account)) return account;
  return { ...account, slotsUnlocked: account.slotsUnlocked + 1 };
}

export function canPlaySlot(account: Account, slotId: SlotId, occupied: boolean): boolean {
  return slotState(account, slotId, occupied) === 'occupied';
}

export function setActiveSlot(account: Account, slotId: SlotId | null): Account {
  return { ...account, activeSlotId: slotId };
}

/**
 * What a character reset does to the *account*: nothing, except letting go of the
 * slot if it was the active one. The character record itself is deleted by the
 * save layer, which keeps a recoverable backup (Brief §19, Q4, SAVE_SCHEMA §9).
 */
export function afterCharacterReset(account: Account, slotId: SlotId): Account {
  return account.activeSlotId === slotId ? setActiveSlot(account, null) : account;
}

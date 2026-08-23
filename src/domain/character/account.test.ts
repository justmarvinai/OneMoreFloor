import { describe, expect, it } from 'vitest';
import {
  afterCharacterReset,
  canPlaySlot,
  canUnlockAnotherSlot,
  createAccount,
  setActiveSlot,
  slotState,
  slotStates,
  unlockNextSlot,
} from './account.ts';

describe('createAccount', () => {
  it('starts with one slot, no upgrades and nobody playing', () => {
    expect(createAccount()).toEqual({
      battleSpeedTier: 0,
      slotsUnlocked: 1,
      activeSlotId: null,
      tutorialCompleted: false,
      backpackSlots: 20,
      bestiary: {},
    });
  });
});

describe('slot states', () => {
  it('reports locked, empty and occupied correctly', () => {
    const account = { ...createAccount(), slotsUnlocked: 2 };
    expect(slotState(account, 1, true)).toBe('occupied');
    expect(slotState(account, 2, false)).toBe('empty');
    expect(slotState(account, 3, false)).toBe('locked');
  });

  it('treats a bought-but-empty slot as playable only once filled', () => {
    const account = { ...createAccount(), slotsUnlocked: 2 };
    expect(canPlaySlot(account, 2, false)).toBe(false);
    expect(canPlaySlot(account, 2, true)).toBe(true);
  });

  it('lists all five slots in order whatever is unlocked', () => {
    const account = { ...createAccount(), slotsUnlocked: 3 };
    expect(slotStates(account, [1])).toEqual([
      { slotId: 1, state: 'occupied' },
      { slotId: 2, state: 'empty' },
      { slotId: 3, state: 'empty' },
      { slotId: 4, state: 'locked' },
      { slotId: 5, state: 'locked' },
    ]);
  });
});

describe('unlocking slots', () => {
  it('unlocks up to five and no further (§15.2)', () => {
    let account = createAccount();
    for (let expected = 2; expected <= 5; expected += 1) {
      expect(canUnlockAnotherSlot(account)).toBe(true);
      account = unlockNextSlot(account);
      expect(account.slotsUnlocked).toBe(expected);
    }
    expect(canUnlockAnotherSlot(account)).toBe(false);
    expect(unlockNextSlot(account).slotsUnlocked).toBe(5);
  });

  it('does not mutate the account it is given', () => {
    const account = createAccount();
    unlockNextSlot(account);
    expect(account.slotsUnlocked).toBe(1);
  });
});

describe('active slot', () => {
  it('sets and clears who is being played (Q2)', () => {
    const account = setActiveSlot(createAccount(), 2);
    expect(account.activeSlotId).toBe(2);
    expect(setActiveSlot(account, null).activeSlotId).toBeNull();
  });
});

describe('afterCharacterReset', () => {
  it('keeps account upgrades — they survive a reset (Q4)', () => {
    const account = {
      ...createAccount(),
      battleSpeedTier: 2 as const,
      slotsUnlocked: 4,
      activeSlotId: 1 as const,
      tutorialCompleted: true,
    };

    const after = afterCharacterReset(account, 1);

    expect(after.battleSpeedTier).toBe(2);
    expect(after.slotsUnlocked).toBe(4);
    expect(after.tutorialCompleted).toBe(true);
  });

  it('lets go of the slot when the reset character was the active one', () => {
    const account = setActiveSlot(createAccount(), 1);
    expect(afterCharacterReset(account, 1).activeSlotId).toBeNull();
  });

  it('leaves the active slot alone when a different character is reset', () => {
    const account = setActiveSlot(createAccount(), 1);
    expect(afterCharacterReset(account, 2).activeSlotId).toBe(1);
  });
});

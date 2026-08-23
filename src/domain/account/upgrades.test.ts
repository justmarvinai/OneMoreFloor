import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SLOT_PRICE,
  BATTLE_SPEED_BY_TIER,
  BATTLE_SPEED_PRICE,
  MAX_ACCOUNT_SLOTS,
} from '@/content/balance/account.ts';
import { createAccount } from '@/domain/character/account.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import { battleSpeedOf, buyUpgrade, offersFor } from './upgrades.ts';

function hero(gold: number): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: 0,
    runSeed: 'upgrade-test',
  });
  return { ...base, currencies: { ...base.currencies, gold } };
}

describe('the two account upgrades (Brief §15)', () => {
  it('offers exactly two, and no mechanism for a third', () => {
    expect(offersFor(createAccount(), 0)).toHaveLength(2);
  });

  it('starts every account at x1 and one slot', () => {
    const account = createAccount();
    expect(battleSpeedOf(account)).toBe(1);
    expect(account.slotsUnlocked).toBe(1);
  });

  it('walks Battle Speed x1 → x2 → x4 → x8 and stops (Q19)', () => {
    let account: Account = createAccount();
    const rates = [battleSpeedOf(account)];

    for (let step = 0; step < 5; step += 1) {
      const outcome = buyUpgrade(account, hero(100_000_000), 'battleSpeed');
      if (outcome === 'maxed') break;
      if (typeof outcome === 'string') throw new Error(outcome);
      account = outcome.account;
      rates.push(battleSpeedOf(account));
    }

    expect(rates).toEqual([1, 2, 4, 8]);
    expect(buyUpgrade(account, hero(100_000_000), 'battleSpeed')).toBe('maxed');
  });

  it('concentrates the cost at the top — x8 is the long-term goal (§15.1)', () => {
    expect(BATTLE_SPEED_PRICE[2]).toBeGreaterThan(BATTLE_SPEED_PRICE[1] * 5);
    expect(BATTLE_SPEED_PRICE[3]).toBeGreaterThan(BATTLE_SPEED_PRICE[2] * 5);
  });

  it('keeps the second character slot cheap and the rest expensive (§15.2)', () => {
    expect(ACCOUNT_SLOT_PRICE[2]!).toBeLessThan(ACCOUNT_SLOT_PRICE[3]! / 10);
    for (let slot = 3; slot <= MAX_ACCOUNT_SLOTS; slot += 1) {
      expect(ACCOUNT_SLOT_PRICE[slot]!).toBeGreaterThan(ACCOUNT_SLOT_PRICE[slot - 1]!);
    }
  });

  it('unlocks slots to five and stops there (§15.2)', () => {
    let account: Account = createAccount();
    for (let step = 0; step < 10; step += 1) {
      const outcome = buyUpgrade(account, hero(100_000_000), 'accountSlot');
      if (outcome === 'maxed') break;
      if (typeof outcome === 'string') throw new Error(outcome);
      account = outcome.account;
    }
    expect(account.slotsUnlocked).toBe(MAX_ACCOUNT_SLOTS);
  });

  it('refuses a purchase the purse cannot cover, and takes nothing', () => {
    const account = createAccount();
    expect(buyUpgrade(account, hero(0), 'battleSpeed')).toBe('notEnoughGold');
  });

  it('charges the character who is playing, since there is no account purse (Q4)', () => {
    const account = createAccount();
    const rich = hero(1_000_000);
    const outcome = buyUpgrade(account, rich, 'accountSlot');
    if (typeof outcome === 'string') throw new Error(outcome);

    expect(outcome.character.currencies.gold).toBe(rich.currencies.gold - outcome.cost);
    expect(outcome.account.slotsUnlocked).toBe(2);
    // The upgrade lives on the account, which a character reset never touches.
    expect(outcome.account).not.toBe(account);
  });

  it('says what it would cost before it is affordable (§20.5)', () => {
    const offers = offersFor(createAccount(), 0);
    for (const offer of offers) {
      expect(offer.cost).toBeGreaterThan(0);
      expect(offer.affordable).toBe(false);
    }
  });

  it('maps every tier to a playback rate the fight can use (§3.5)', () => {
    expect(Object.values(BATTLE_SPEED_BY_TIER)).toEqual([1, 2, 4, 8]);
  });
});

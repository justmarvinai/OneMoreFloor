/**
 * The account upgrades (Brief §15, extended by Q30).
 *
 * §15 said "exactly two account upgrades exist in EA 0.1. Do not add more",
 * which is why the kind is a small union rather than a registry: a new one is
 * not expressible without editing this file and reading the brief line above
 * it. The owner added the **third** — backpack size — in the fifth polish
 * round, and that is recorded in USER_QUESTIONS as Q30 rather than assumed. The
 * union stays a union for exactly the same reason it was one before.
 *
 * Upgrades belong to the account and survive a character reset (Q4), but gold
 * belongs to a character — there is no account purse. So a purchase is paid by
 * whoever is being played, and the screen says so rather than leaving the player
 * to wonder whose money went.
 */
import {
  ACCOUNT_SLOT_PRICE,
  BACKPACK_SLOT_PRICE,
  BACKPACK_SLOT_STEP,
  BATTLE_SPEED_BY_TIER,
  BATTLE_SPEED_PRICE,
  MAX_ACCOUNT_SLOTS,
  MAX_BACKPACK_SLOTS,
} from '@/content/balance/account.ts';
import type { Account, BattleSpeedTier, Character } from '../character/types.ts';

export type UpgradeId = 'battleSpeed' | 'accountSlot' | 'backpack';

export interface UpgradeOffer {
  id: UpgradeId;
  /** Null when the upgrade is fully bought. */
  cost: number | null;
  /** The tier or slot number this purchase would reach. */
  nextStep: number | null;
  /** True when the active character can pay for it right now. */
  affordable: boolean;
}

export function nextBattleSpeedTier(account: Account): BattleSpeedTier | null {
  return account.battleSpeedTier >= 3 ? null : ((account.battleSpeedTier + 1) as BattleSpeedTier);
}

export function nextSlot(account: Account): number | null {
  return account.slotsUnlocked >= MAX_ACCOUNT_SLOTS ? null : account.slotsUnlocked + 1;
}

export function battleSpeedCost(account: Account): number | null {
  const tier = nextBattleSpeedTier(account);
  return tier === null ? null : BATTLE_SPEED_PRICE[tier];
}

export function slotCost(account: Account): number | null {
  const slot = nextSlot(account);
  return slot === null ? null : (ACCOUNT_SLOT_PRICE[slot] ?? null);
}

/** The backpack size the next purchase would reach, or null at the ceiling. */
export function nextBackpackSize(account: Account): number | null {
  const next = account.backpackSlots + BACKPACK_SLOT_STEP;
  return next > MAX_BACKPACK_SLOTS ? null : next;
}

export function backpackCost(account: Account): number | null {
  const next = nextBackpackSize(account);
  // A size with no price cannot be bought, which is what makes the table the
  // ceiling rather than a second check that can drift away from it.
  return next === null ? null : (BACKPACK_SLOT_PRICE[next] ?? null);
}

/** Every offer, priced against the purse actually paying (Q4). */
export function offersFor(account: Account, purse: number): UpgradeOffer[] {
  const speed = battleSpeedCost(account);
  const slot = slotCost(account);
  const bag = backpackCost(account);
  return [
    {
      id: 'battleSpeed',
      cost: speed,
      nextStep: nextBattleSpeedTier(account),
      affordable: speed !== null && purse >= speed,
    },
    {
      id: 'accountSlot',
      cost: slot,
      nextStep: nextSlot(account),
      affordable: slot !== null && purse >= slot,
    },
    {
      id: 'backpack',
      cost: bag,
      nextStep: nextBackpackSize(account),
      affordable: bag !== null && purse >= bag,
    },
  ];
}

export type PurchaseRefusal = 'maxed' | 'notEnoughGold';

export interface PurchaseOutcome {
  account: Account;
  character: Character;
  cost: number;
}

/**
 * Buy an upgrade, charging the character who is playing.
 *
 * Returns both records because both change together: an account that gained a
 * tier while the gold stayed in the purse would be free money on the next
 * reload.
 */
export function buyUpgrade(
  account: Account,
  character: Character,
  id: UpgradeId,
): PurchaseOutcome | PurchaseRefusal {
  const cost =
    id === 'battleSpeed'
      ? battleSpeedCost(account)
      : id === 'accountSlot'
        ? slotCost(account)
        : backpackCost(account);
  if (cost === null) return 'maxed';
  if (character.currencies.gold < cost) return 'notEnoughGold';

  const upgraded: Account =
    id === 'battleSpeed'
      ? { ...account, battleSpeedTier: nextBattleSpeedTier(account)! }
      : id === 'accountSlot'
        ? { ...account, slotsUnlocked: nextSlot(account)! }
        : { ...account, backpackSlots: nextBackpackSize(account)! };

  return {
    account: upgraded,
    character: {
      ...character,
      currencies: { ...character.currencies, gold: character.currencies.gold - cost },
    },
    cost,
  };
}

/** The multiplier fights currently play at (Brief §3.5). */
export function battleSpeedOf(account: Account): number {
  return BATTLE_SPEED_BY_TIER[account.battleSpeedTier];
}

export { MAX_ACCOUNT_SLOTS, MAX_BACKPACK_SLOTS };

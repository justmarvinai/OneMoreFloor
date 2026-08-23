/**
 * Potions (Brief §12, Q9/Q18).
 *
 * Three rules from the answers are enforced by shape rather than by discipline:
 *
 *  - **One active potion per stat.** The store is keyed by stat, so a second
 *    Draught of Might cannot coexist with the first — drinking replaces it and
 *    restarts the hour (Q18). Stacking is not a rule that can be broken; it is a
 *    state that cannot be written.
 *  - **Speed has no potion.** The key type is `UpgradableStatId`, which excludes
 *    Speed, so a Speed potion is not expressible anywhere in the game (§6).
 *  - **The hour is real time** (Q9). Every function here takes `now` from the
 *    caller — the tamper-damped clock service, never `Date.now()` — so a potion
 *    drunk before closing the tab has genuinely burned down when it reopens.
 *
 * Potions deliberately do **not** count toward Power Level. A drinkable bracket
 * jump would let a player potion up, pull better loot, and let the potion lapse
 * — exactly the overshoot §13 exists to prevent. They raise what the hero *hits
 * with*, never what the game thinks they are worth.
 */
import { POTION_DURATION_MS } from '@/content/balance/potions.ts';
import type { PotionDef } from '@/content/items/potions.ts';
import { emptyStatBlock, type StatBlock, type UpgradableStatId } from '../stats.ts';

export interface ActivePotion {
  stat: UpgradableStatId;
  /** Fraction of the stat it adds, frozen at the moment it was drunk. */
  magnitude: number;
  /** Which bracket brewed it, for the UI. */
  tier: number;
  /** Wall-clock milliseconds at which it stops working. */
  expiresAt: number;
}

/** One slot per stat — the type is Q18's concurrency rule. */
export type ActivePotions = Partial<Record<UpgradableStatId, ActivePotion>>;

/** Drink one. Any potion already running on that stat is replaced outright. */
export function drink(potions: ActivePotions, potion: PotionDef, now: number): ActivePotions {
  return {
    ...potions,
    [potion.stat]: {
      stat: potion.stat,
      magnitude: potion.magnitude,
      tier: potion.tier,
      expiresAt: now + POTION_DURATION_MS,
    },
  };
}

/** Everything still running, newest expiry last — for a stable UI order. */
export function activePotions(potions: ActivePotions, now: number): ActivePotion[] {
  return Object.values(potions)
    .filter((potion): potion is ActivePotion => potion !== undefined && potion.expiresAt > now)
    .sort((a, b) => a.stat.localeCompare(b.stat));
}

export function isActive(potions: ActivePotions, stat: UpgradableStatId, now: number): boolean {
  const potion = potions[stat];
  return potion !== undefined && potion.expiresAt > now;
}

export function remainingMs(potion: ActivePotion, now: number): number {
  return Math.max(0, potion.expiresAt - now);
}

/**
 * Drop what has run out.
 *
 * Expiry is decided by `now` everywhere, so this is housekeeping rather than a
 * rule: pruning keeps a save from carrying last week's empty flasks, and never
 * changes what any stat calculation would have returned.
 */
export function prune(potions: ActivePotions, now: number): ActivePotions {
  const kept: ActivePotions = {};
  for (const potion of activePotions(potions, now)) kept[potion.stat] = potion;
  return kept;
}

/**
 * What the running potions add, as a percentage of the hero's own stats.
 *
 * A percentage rather than a flat value because the tower is endless: a potion
 * that reads "+40 Strength" is a gift on floor 10 and an insult on floor 1000
 * (BALANCE.md §9).
 */
export function potionBonus(stats: StatBlock, potions: ActivePotions, now: number): StatBlock {
  const bonus = emptyStatBlock();
  for (const potion of activePotions(potions, now)) {
    // At least one point: a potion that rounds to nothing is a lie on a label.
    bonus[potion.stat] = Math.max(1, Math.floor(stats[potion.stat] * potion.magnitude));
  }
  return bonus;
}

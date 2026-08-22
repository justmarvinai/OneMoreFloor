/**
 * Account-upgrade tables (Brief §15).
 *
 * Prices land in M6 with the upgrade screen; what lives here now is the one
 * number combat needs — how fast a fight plays at each Battle Speed tier. It is
 * a tuned value like any other, so it belongs in content rather than in the
 * performer that reads it (Brief §3.7).
 */
import type { BattleSpeedTier } from '@/domain/character/types.ts';

/**
 * Playback multipliers by tier (Brief §3.5, shaped by Q19). Tier 0 is what every
 * account starts with; the upgrade walks it up to x8, and §15.1 requires that
 * walk to be long and expensive.
 */
export const BATTLE_SPEED_BY_TIER: Readonly<Record<BattleSpeedTier, number>> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
};

/** Every tier in order, for a UI that shows what is bought and what is not. */
export const BATTLE_SPEED_TIERS: readonly BattleSpeedTier[] = [0, 1, 2, 3];

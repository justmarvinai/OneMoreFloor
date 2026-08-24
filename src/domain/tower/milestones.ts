/**
 * Milestone floors.
 *
 * Every twenty-fifth floor pays a chest the first time it is ever cleared. The
 * endless tower's problem is that floor 340 feels exactly like floor 339; a
 * milestone is punctuation — something to climb *toward* rather than merely
 * further.
 *
 * Two rules keep it honest:
 *
 *  - **Per record, not per run.** The tower runs strictly upward (Q23), so a
 *    first-ever clear is the only moment a milestone can be earned. Paying it
 *    again on the re-climb would turn the walk back up into a farm, which is the
 *    opposite of what §3.4's record is for.
 *  - **Priced off the floor's own curve.** The chest is a multiple of what the
 *    floor already pays, so it scales with everything else and there is no
 *    second table to drift (§3.7).
 */
import {
  MILESTONE_EVERY,
  MILESTONE_GOLD_MULTIPLIER,
  MILESTONE_LUCKY_EVERY,
  MILESTONE_MATERIAL_COUNT,
  MILESTONE_XP_MULTIPLIER,
} from '@/content/balance/rewards.ts';
import { materialIdForTier } from '@/content/items/materials.ts';
import type { Rng } from '@/app/rng.ts';
import type { Bracket } from '../power/brackets.ts';
import type { Character } from '../character/types.ts';
import { floorRewardEstimate, type FloorReward } from './rewards.ts';

/** Is this floor a milestone at all? */
export function isMilestone(floor: number): boolean {
  return floor > 0 && floor % MILESTONE_EVERY === 0;
}

/** The next milestone at or above `floor` — what the trail draws toward. */
export function nextMilestoneAfter(floor: number): number {
  return (Math.floor(Math.max(0, floor) / MILESTONE_EVERY) + 1) * MILESTONE_EVERY;
}

/** True when clearing this floor would pay a chest this hero has not had. */
export function milestoneUnclaimed(character: Character, floor: number): boolean {
  return isMilestone(floor) && !character.tower.milestonesClaimed.includes(floor);
}

export interface MilestoneInput {
  floor: number;
  bracket: Bracket;
  rng: Rng;
}

/**
 * What a milestone chest holds.
 *
 * Deliberately currency-and-materials rather than gear: gear is an event on
 * boss floors now (see BALANCE's retuned drop economy), and a milestone is a
 * *reward for depth*, which is what buys and builds gear rather than replacing
 * it.
 */
export function rollMilestoneReward(input: MilestoneInput): FloorReward {
  const { floor, bracket, rng } = input;
  const base = floorRewardEstimate(floor, false);
  const count = rng.int(MILESTONE_MATERIAL_COUNT.min, MILESTONE_MATERIAL_COUNT.max);

  return {
    gold: Math.max(1, Math.round(base.gold * MILESTONE_GOLD_MULTIPLIER)),
    xp: Math.max(1, Math.round(base.xp * MILESTONE_XP_MULTIPLIER)),
    materials: { [materialIdForTier(bracket.materialTier)]: count },
    items: [],
    tickets: 1,
    // Every fourth milestone — each hundred floors — is the one worth waiting for.
    luckyTickets: (floor / MILESTONE_EVERY) % MILESTONE_LUCKY_EVERY === 0 ? 1 : 0,
  };
}

/**
 * Giving a reward to a character.
 *
 * Floors, quests and (later) the gacha all pay in the same currency — the
 * `FloorReward` shape — so they all bank it through this one function. The
 * alternative is three places that each remember to add gold, merge materials,
 * append items and convert experience into levels, and the third one to be
 * written always forgets the last step.
 *
 * Experience is converted here rather than left raw, for exactly the reason the
 * balance simulator found in M3: a caller holding banked XP is a caller that can
 * count it twice.
 */
import { awardXp } from '../progression/xp.ts';
import type { Character } from '../character/types.ts';
import type { FloorReward } from '../tower/rewards.ts';

export interface GrantResult {
  character: Character;
  /** Levels gained from the experience, for the UI to celebrate. */
  levelsGained: number;
}

export function grantReward(character: Character, reward: FloorReward): GrantResult {
  const materials = { ...character.materials };
  for (const [id, count] of Object.entries(reward.materials)) {
    materials[id] = (materials[id] ?? 0) + count;
  }

  const enriched: Character = {
    ...character,
    currencies: {
      gold: character.currencies.gold + reward.gold,
      tickets: character.currencies.tickets + reward.tickets,
      luckyTickets: character.currencies.luckyTickets + reward.luckyTickets,
    },
    materials,
    inventory: [...character.inventory, ...reward.items],
  };

  const levelled = awardXp(enriched, reward.xp);
  return { character: levelled.character, levelsGained: levelled.levelsGained };
}

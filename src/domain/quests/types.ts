/**
 * Quest vocabulary.
 *
 * Split from the rules so `character/types.ts` can hold a board without
 * importing the module that reads a character.
 */
import type { FloorReward } from '../tower/rewards.ts';

export interface QuestState {
  templateId: string;
  /** What this period asks for, scaled to the hero's depth when it was rolled. */
  target: number;
  progress: number;
  claimed: boolean;
  /** Rolled with the board, so the player can see the payout before chasing it. */
  reward: FloorReward;
}

export interface QuestBoard {
  /** `YYYY-MM-DD` for dailies, `YYYY-Www` for weeklies (Q10). */
  periodKey: string;
  quests: QuestState[];
}

export interface QuestsState {
  daily: QuestBoard;
  weekly: QuestBoard;
}

/**
 * What the game tells the quest engine about. Deliberately a small, closed set:
 * every entry is something a player *did*, not something the game inferred, so
 * a quest can never advance from a state change nobody caused.
 */
export type QuestEvent =
  | { kind: 'floorCleared'; floor: number; isBoss: boolean }
  | { kind: 'goldEarned'; amount: number }
  | { kind: 'goldSpent'; amount: number }
  | { kind: 'gearUpgraded' }
  | { kind: 'itemBought' }
  | { kind: 'itemSold' }
  | { kind: 'potionDrunk' };

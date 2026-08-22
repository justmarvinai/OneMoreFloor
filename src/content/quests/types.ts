/**
 * The shape of a quest template (Brief §17, CONTENT_PIPELINE §2).
 *
 * A template is not a quest — it is a *recipe*. The board instantiates it each
 * period against the character's own depth, which is what keeps "one day of
 * normal play" true on floor 8 and on floor 800 without anyone maintaining two
 * hundred hand-written quests.
 */
import type { StringKey } from '@/strings/index.ts';

/**
 * The engine's fixed objective vocabulary. Templates are data; these are not —
 * each one is something the game knows how to *observe*, and adding a kind is
 * the one part of quest authoring that touches code (CONTENT_PIPELINE §2).
 */
export type ObjectiveKind =
  | 'clearFloors'
  | 'defeatBosses'
  | 'reachFloor'
  | 'earnGold'
  | 'spendGold'
  | 'upgradeGear'
  | 'buyItems'
  | 'sellItems'
  | 'drinkPotions';

export type QuestCadence = 'daily' | 'weekly';

/**
 * What a template's `base` is measured in — and therefore how it scales.
 *
 * The unit is the whole scaling story, which is why it is a word rather than a
 * number. A floor is one click at any depth, so counts stay flat. Gold income is
 * exponential in floor number, so a gold target has to be *priced against the
 * hero's own earning depth* — anchoring it to their bracket instead would hand a
 * freshly-geared level-2 hero a "spend 45,000 gold" weekly they could not touch.
 */
export type ObjectiveUnit =
  /** `base` is the target, unchanged at every depth. */
  | 'count'
  /** `base` is how many floors' worth of gold, priced at the hero's depth. */
  | 'goldFloors'
  /** `base` is a multiple of the hero's best floor — "go deeper than you have". */
  | 'depth';

export interface QuestTemplate {
  id: string;
  nameKey: StringKey;
  cadence: QuestCadence;
  /** Hard quests are the only ones eligible for ticket rewards (§17). */
  difficulty: 'normal' | 'hard';
  objective: ObjectiveKind;
  unit: ObjectiveUnit;
  base: number;
  icon: string;
}

/**
 * The quest template pool (Brief §17, Q21).
 *
 * A starting pool wide enough that a board is rarely the same two days running,
 * and shaped so the three dailies ask for different *kinds* of play — climb,
 * spend, tinker — rather than three variations on "clear floors". The full EA
 * volume lands in M8; adding to it is a data edit (CONTENT_PIPELINE §4).
 *
 * Units carry the scaling: counts stay flat with depth because a floor is one
 * click at any depth, gold targets are priced in floors' worth of income, and
 * the two "go deeper" weeklies are a multiple of the hero's own best floor
 * (see `ObjectiveUnit`).
 */
import type { QuestTemplate } from './types.ts';

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  // --- Dailies: a session's worth, in three different flavours -------------
  {
    id: 'quest.daily.climb',
    nameKey: 'quest.daily.climb',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'clearFloors',
    unit: 'count',
    base: 12,
    icon: 'glyph-crossed-swords',
  },
  {
    id: 'quest.daily.boss',
    nameKey: 'quest.daily.boss',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'defeatBosses',
    unit: 'count',
    base: 1,
    icon: 'glyph-flaming-skull',
  },
  {
    id: 'quest.daily.spend',
    nameKey: 'quest.daily.spend',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'spendGold',
    unit: 'goldFloors',
    base: 14,
    icon: 'icon-coins',
  },
  {
    id: 'quest.daily.upgrade',
    nameKey: 'quest.daily.upgrade',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'upgradeGear',
    unit: 'count',
    base: 3,
    icon: 'glyph-hammer-hit',
  },
  {
    id: 'quest.daily.shop',
    nameKey: 'quest.daily.shop',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'buyItems',
    unit: 'count',
    base: 2,
    icon: 'glyph-burning-scroll',
  },
  {
    id: 'quest.daily.sell',
    nameKey: 'quest.daily.sell',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'sellItems',
    unit: 'count',
    base: 4,
    icon: 'icon-sack',
  },
  {
    id: 'quest.daily.draught',
    nameKey: 'quest.daily.draught',
    cadence: 'daily',
    difficulty: 'normal',
    objective: 'drinkPotions',
    unit: 'count',
    base: 2,
    icon: 'icon-potion',
  },

  // --- Weeklies: a week's worth, and one that is meant to hurt -------------
  {
    id: 'quest.weekly.climb',
    nameKey: 'quest.weekly.climb',
    cadence: 'weekly',
    difficulty: 'normal',
    objective: 'clearFloors',
    unit: 'count',
    base: 90,
    icon: 'glyph-crossed-swords',
  },
  {
    id: 'quest.weekly.earn',
    nameKey: 'quest.weekly.earn',
    cadence: 'weekly',
    difficulty: 'normal',
    objective: 'earnGold',
    unit: 'goldFloors',
    base: 90,
    icon: 'icon-coins',
  },
  {
    id: 'quest.weekly.upgrade',
    nameKey: 'quest.weekly.upgrade',
    cadence: 'weekly',
    difficulty: 'normal',
    objective: 'upgradeGear',
    unit: 'count',
    base: 22,
    icon: 'glyph-hammer-hit',
  },
  {
    id: 'quest.weekly.shop',
    nameKey: 'quest.weekly.shop',
    cadence: 'weekly',
    difficulty: 'normal',
    objective: 'buyItems',
    unit: 'count',
    base: 10,
    icon: 'glyph-burning-scroll',
  },
  {
    id: 'quest.weekly.bosses',
    nameKey: 'quest.weekly.bosses',
    cadence: 'weekly',
    difficulty: 'hard',
    objective: 'defeatBosses',
    unit: 'count',
    base: 8,
    icon: 'glyph-flaming-skull',
  },
  {
    id: 'quest.weekly.deep',
    nameKey: 'quest.weekly.deep',
    cadence: 'weekly',
    difficulty: 'hard',
    objective: 'reachFloor',
    unit: 'depth',
    base: 1.35,
    icon: 'glyph-celestial-body',
  },
  {
    id: 'quest.weekly.fortune',
    nameKey: 'quest.weekly.fortune',
    cadence: 'weekly',
    difficulty: 'hard',
    objective: 'earnGold',
    unit: 'goldFloors',
    base: 320,
    icon: 'glyph-trophy-cup',
  },
];

export function questTemplate(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((template) => template.id === id);
}

export function templatesFor(
  cadence: QuestTemplate['cadence'],
  difficulty?: QuestTemplate['difficulty'],
): QuestTemplate[] {
  return QUEST_TEMPLATES.filter(
    (template) =>
      template.cadence === cadence &&
      (difficulty === undefined || template.difficulty === difficulty),
  );
}

export type { QuestTemplate };
export type { ObjectiveKind, ObjectiveUnit, QuestCadence } from './types.ts';

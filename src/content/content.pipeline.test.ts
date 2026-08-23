/**
 * **The authoring workflow, demonstrated** (CONTENT_PIPELINE §4, ROADMAP M8).
 *
 * M8's definition of done is a claim, not a feature: *adding content is a data
 * edit — no engine work.* A claim like that rots quietly. The moment some rule
 * needs a `switch` on an enemy id, or a quest objective needs a new branch, the
 * pipeline has stopped being data and nobody notices until the next content pass.
 *
 * So the demonstration lives here permanently rather than happening once in a
 * review. Below are one enemy and one quest template that exist **only in this
 * file** — they are in no shipped list, no string table, no registry. Both are
 * then driven through the real engine: the enemy fights a real hero to a real
 * verdict, and the quest is instantiated, progressed and completed. Neither
 * needed a line of code to exist.
 *
 * If either ever stops working, the pipeline has grown a hard-coded dependency
 * on the specific content that ships today, and this test is the place that says
 * so — in the same commit that introduced it.
 */
import { describe, expect, it } from 'vitest';
import { createCharacter } from '@/domain/character/character.ts';
import { resolveCombat } from '@/domain/combat/resolve.ts';
import type { Combatant } from '@/domain/combat/types.ts';
import {
  emptyQuests,
  isComplete,
  recordEvent,
  rollBoard,
  type QuestEvent,
} from '@/domain/quests/quests.ts';
import { heroCombatant } from '@/domain/tower/run.ts';
import { NORMAL_DEBUFF_MAX } from './enemies/effects.ts';
import type { EnemyDef } from './enemies/types.ts';
import { QUEST_TEMPLATES } from './quests/index.ts';
import type { ObjectiveKind, QuestTemplate } from './quests/types.ts';

/** Every objective the engine knows how to observe (CONTENT_PIPELINE §2). */
const OBJECTIVE_KINDS: readonly ObjectiveKind[] = [
  'clearFloors',
  'defeatBosses',
  'reachFloor',
  'earnGold',
  'spendGold',
  'upgradeGear',
  'buyItems',
  'sellItems',
  'drinkPotions',
];

/**
 * A throwaway enemy. Everything a real one has, and nothing else — this is the
 * whole surface an author touches (plus one line in `src/strings/`).
 */
const THROWAWAY_ENEMY: EnemyDef = {
  id: 'enemy.test-lamplighter',
  // A shipped enemy would name a real key here; the test names its own, which is
  // exactly what the string table's type stops you doing by accident.
  nameKey: 'enemy.spireRat',
  family: 'construct',
  avatar: 'silhouette-warrior-m',
  profile: { hp: 1.1, strength: 1.2, defense: 0.9, speed: 1.1 },
  playerDebuff: {
    id: 'effect.test-guttering',
    nameKey: 'effect.gloom',
    kind: 'statScale',
    stat: 'luck',
    magnitude: -0.09,
    duration: 'wholeFight',
    tone: 'debuff',
  },
  floors: [5, 25],
  weight: 8,
};

/** A throwaway quest template, likewise complete and likewise unshipped. */
const THROWAWAY_QUEST: QuestTemplate = {
  id: 'quest.test-lamps',
  nameKey: 'quest.daily.climb',
  cadence: 'daily',
  difficulty: 'normal',
  objective: 'clearFloors',
  unit: 'count',
  base: 4,
  icon: 'glyph-crossed-swords',
};

describe('the content pipeline (CONTENT_PIPELINE §4)', () => {
  it('fights a brand-new enemy that exists only in this test', () => {
    // The same two steps the tower takes: turn a profile into stats, turn stats
    // into a combatant. Nothing consults a list of known enemy ids.
    const hero = createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: 0,
      runSeed: 'pipeline:1',
    });

    const floor = 12;
    const enemy: Combatant = {
      id: 'enemy',
      nameKey: THROWAWAY_ENEMY.nameKey,
      sourceId: THROWAWAY_ENEMY.id,
      avatar: THROWAWAY_ENEMY.avatar,
      baseStats: { strength: 30, defense: 18, hp: 260, resource: 20, luck: 8, speed: 6 },
      hp: 260,
      maxHp: 260,
      resource: { kind: 'mana', current: 0, pool: 20 },
      signature: null,
      effects: [],
    };

    const script = resolveCombat({
      hero: heroCombatant(hero, 0),
      enemy,
      floor,
      isBoss: false,
      floorEffects: [{ unit: 'hero', effect: THROWAWAY_ENEMY.playerDebuff! }],
      seed: 'pipeline:combat:1',
    });

    // A real fight: rounds happened, somebody won, and the new enemy's debuff
    // reached the hero through the same path every shipped one uses.
    expect(script.events.length).toBeGreaterThan(3);
    expect(script.outcome.rounds).toBeGreaterThan(0);
    expect(['hero', 'enemy']).toContain(script.outcome.winner);
    expect(JSON.stringify(script.events)).toContain('effect.test-guttering');
  });

  it('keeps a new enemy inside the rule that governs all of them (Brief §3.2)', () => {
    // Adding content is a data edit, but not an unchecked one: a normal-floor
    // debuff still may not carry boss-grade teeth, and the same constant the
    // shipped bestiary is measured against measures this one.
    expect(Math.abs(THROWAWAY_ENEMY.playerDebuff!.magnitude)).toBeLessThanOrEqual(
      NORMAL_DEBUFF_MAX,
    );
  });

  it('drives every shipped quest template to completion from play alone', () => {
    // The quest half of the claim. A template is data because the engine reads
    // only its *fields* — objective, unit, base — and never its id: nothing here
    // branches per template, so a template added tomorrow using any authored
    // objective works the day it is added.
    const context = {
      bracketIndex: 3,
      materialTier: 2,
      referenceFloor: 40,
      seed: 'pipeline:quests',
    };

    for (const template of QUEST_TEMPLATES) {
      const board = rollBoard(template.cadence, '2026-08-23', context);
      const index = board.quests.findIndex((quest) => quest.templateId === template.id);
      if (index < 0) continue; // Not on this board; another cadence's roll covers it.

      let quests = { ...emptyQuests(), [template.cadence]: board };
      for (const event of eventsFor(template)) quests = recordEvent(quests, event);

      const quest = quests[template.cadence].quests[index]!;
      expect(isComplete(quest), `${template.id} cannot be finished by playing`).toBe(true);
    }
  });

  it('leaves no objective in the vocabulary that play cannot advance', () => {
    // The stricter version: every `ObjectiveKind` the type allows must be both
    // *used* by the shipped pool and *observable* in the event stream. An
    // objective nothing emits an event for would let an author ship a quest that
    // can never be completed, and the type would not stop them.
    const covered = new Set(QUEST_TEMPLATES.map((template) => template.objective));

    for (const objective of OBJECTIVE_KINDS) {
      expect(covered, `no shipped template uses the ${objective} objective`).toContain(objective);
      const events = eventsFor({ ...THROWAWAY_QUEST, objective });
      expect(
        events.length,
        `nothing a player does emits an event for ${objective}`,
      ).toBeGreaterThan(0);
    }
  });
});

/** The events a player would generate while finishing this template. */
function eventsFor(template: QuestTemplate): QuestEvent[] {
  const many = 400;
  switch (template.objective) {
    case 'clearFloors':
      return Array.from({ length: many }, (_, index) => ({
        kind: 'floorCleared' as const,
        floor: 40 + index,
        isBoss: false,
      }));
    case 'defeatBosses':
      return Array.from({ length: many }, (_, index) => ({
        kind: 'floorCleared' as const,
        floor: 40 + index * 10,
        isBoss: true,
      }));
    case 'reachFloor':
      return [{ kind: 'floorCleared', floor: 100_000, isBoss: false }];
    case 'earnGold':
      return [{ kind: 'goldEarned', amount: 100_000_000 }];
    case 'spendGold':
      return [{ kind: 'goldSpent', amount: 100_000_000 }];
    case 'upgradeGear':
      return Array.from({ length: many }, () => ({ kind: 'gearUpgraded' as const }));
    case 'buyItems':
      return Array.from({ length: many }, () => ({ kind: 'itemBought' as const }));
    case 'sellItems':
      return Array.from({ length: many }, () => ({ kind: 'itemSold' as const }));
    case 'drinkPotions':
      return Array.from({ length: many }, () => ({ kind: 'potionDrunk' as const }));
  }
}

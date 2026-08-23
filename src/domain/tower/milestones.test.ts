import { describe, expect, it } from 'vitest';
import { createRng } from '@/app/rng.ts';
import { MILESTONE_EVERY } from '@/content/balance/rewards.ts';
import { bracketAt } from '@/domain/power/brackets.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Character } from '@/domain/character/types.ts';
import { applyClear, applyDeath } from './run.ts';
import {
  isMilestone,
  milestoneUnclaimed,
  nextMilestoneAfter,
  rollMilestoneReward,
} from './milestones.ts';

const NOW = 1_700_000_000_000;

function hero(patch: Partial<Character> = {}): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Grimhild',
    classId: 'warrior',
    createdAt: NOW,
    runSeed: 'milestone-test',
  });
  return { ...base, ...patch };
}

const nothing = { gold: 0, xp: 0, materials: {}, items: [], tickets: 0, luckyTickets: 0 };

describe('milestone floors', () => {
  it('lands every twenty-fifth floor and nowhere else', () => {
    expect(isMilestone(MILESTONE_EVERY)).toBe(true);
    expect(isMilestone(MILESTONE_EVERY * 4)).toBe(true);
    expect(isMilestone(MILESTONE_EVERY - 1)).toBe(false);
    expect(isMilestone(0)).toBe(false);
    expect(nextMilestoneAfter(1)).toBe(MILESTONE_EVERY);
    expect(nextMilestoneAfter(MILESTONE_EVERY)).toBe(MILESTONE_EVERY * 2);
  });

  it('pays a chest on the first ever clear, and never again', () => {
    const at = MILESTONE_EVERY;
    const climber = hero({
      tower: { ...hero().tower, currentRunFloor: at },
    });

    const first = applyClear(climber, at, nothing, NOW);
    expect(first.milestone, 'first clear pays').not.toBeNull();
    expect(first.character.currencies.gold).toBeGreaterThan(0);
    expect(first.character.tower.milestonesClaimed).toEqual([at]);

    // The tower runs strictly upward (Q23), so the only way back here is a
    // re-climb — and a re-climb must not pay again, or the walk back up becomes
    // the best farm in the game.
    const again = applyClear(first.character, at, nothing, NOW);
    expect(again.milestone, 'the re-climb pays nothing').toBeNull();
    expect(again.character.currencies.gold).toBe(first.character.currencies.gold);
  });

  it('pays currency and materials, never gear', () => {
    const reward = rollMilestoneReward({
      floor: MILESTONE_EVERY * 2,
      bracket: bracketAt(3),
      rng: createRng('milestone'),
    });
    expect(reward.items, 'gear is a boss-floor event, not a milestone').toEqual([]);
    expect(reward.gold).toBeGreaterThan(0);
    expect(Object.values(reward.materials).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(reward.tickets).toBe(1);
  });

  it('survives a death — the record is what earns it, and death does not touch that', () => {
    const at = MILESTONE_EVERY;
    const cleared = applyClear(hero(), at, nothing, NOW).character;
    const dead = applyDeath(cleared, { floor: at + 1, killedBy: 'enemy.rat', now: NOW });
    expect(dead.tower.milestonesClaimed).toEqual([at]);
    expect(milestoneUnclaimed(dead, at)).toBe(false);
  });
});

describe('run history', () => {
  it('writes a run down when it ends, newest first', () => {
    let character = hero();
    character = applyClear(character, 1, { ...nothing, gold: 40 }, NOW).character;
    character = applyClear(character, 2, { ...nothing, gold: 60 }, NOW).character;

    const after = applyDeath(character, { floor: 3, killedBy: 'enemy.rat', now: NOW });
    const [run] = after.tower.history;
    expect(run).toBeDefined();
    expect(run?.floor, 'the deepest floor actually cleared').toBe(2);
    expect(run?.diedOn).toBe(3);
    expect(run?.killedBy).toBe('enemy.rat');
    expect(run?.gold, 'gold banked across the run').toBe(100);
    expect(run?.fights, 'two clears and the fatal one').toBe(3);

    // And the totals start over, so the next run's record is its own.
    expect(after.tower.runGold).toBe(0);
    expect(after.tower.runFights).toBe(0);
  });

  it('keeps the list bounded rather than growing forever', () => {
    let character = hero();
    for (let index = 0; index < 30; index += 1) {
      character = applyDeath(character, { floor: index + 1, killedBy: 'enemy.rat', now: NOW });
    }
    expect(character.tower.history).toHaveLength(20);
    expect(character.tower.history[0]?.diedOn, 'newest first').toBe(30);
  });
});

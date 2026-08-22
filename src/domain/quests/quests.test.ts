import { describe, expect, it } from 'vitest';
import { QUEST_BOARD, QUEST_MIN_DEPTH_TARGET } from '@/content/balance/quests.ts';
import { questTemplate, templatesFor } from '@/content/quests/index.ts';
import { dayKeyOf, weekKeyOf } from '@/app/time.ts';
import {
  claimableCount,
  emptyQuests,
  isClaimable,
  isComplete,
  markClaimed,
  recordEvent,
  refreshBoards,
  rollBoard,
  type QuestContext,
  type QuestsState,
} from './quests.ts';

const NOW = 1_700_000_000_000;

const context: QuestContext = {
  bracketIndex: 3,
  materialTier: 0,
  referenceFloor: 30,
  seed: 'quest-test',
};

function keysAt(timestamp: number): { dayKey: string; weekKey: string } {
  return { dayKey: dayKeyOf(timestamp), weekKey: weekKeyOf(timestamp) };
}

function boards(at = NOW): QuestsState {
  return refreshBoards(emptyQuests(), keysAt(at), context);
}

describe('the board (Q21)', () => {
  it('puts three dailies and three weeklies up', () => {
    const quests = boards();
    expect(quests.daily.quests).toHaveLength(QUEST_BOARD.daily);
    expect(quests.weekly.quests).toHaveLength(QUEST_BOARD.weekly);
  });

  it('always includes exactly one hard weekly — the ticket slot (§17)', () => {
    for (let day = 0; day < 30; day += 1) {
      const quests = boards(NOW + day * 86_400_000);
      const hard = quests.weekly.quests.filter(
        (quest) => questTemplate(quest.templateId)?.difficulty === 'hard',
      );
      expect(hard, `week of day ${day}`).toHaveLength(QUEST_BOARD.hardWeeklies);
    }
  });

  it('never repeats a template within one board', () => {
    const quests = boards();
    for (const board of [quests.daily, quests.weekly]) {
      const ids = board.quests.map((quest) => quest.templateId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('only ever offers tickets on hard quests (§17)', () => {
    for (let day = 0; day < 40; day += 1) {
      const quests = boards(NOW + day * 86_400_000);
      for (const quest of [...quests.daily.quests, ...quests.weekly.quests]) {
        const hard = questTemplate(quest.templateId)?.difficulty === 'hard';
        if (!hard) {
          expect(quest.reward.tickets, quest.templateId).toBe(0);
          expect(quest.reward.luckyTickets, quest.templateId).toBe(0);
        }
      }
    }
  });

  it('rebuilds the same board from the same seed and period', () => {
    expect(rollBoard('daily', '2026-08-22', context)).toEqual(
      rollBoard('daily', '2026-08-22', context),
    );
  });

  it('prices gold targets against the depth the hero actually earns at', () => {
    // The trap this guards: a freshly-geared level-2 hero can already sit
    // several brackets up while still earning floor-4 money. A gold target that
    // followed the bracket would be unreachable for them.
    const shallow = rollBoard('weekly', '2026-W34', { ...context, referenceFloor: 4 });
    const deep = rollBoard('weekly', '2026-W34', { ...context, referenceFloor: 200 });

    for (const [index, quest] of shallow.quests.entries()) {
      const template = questTemplate(quest.templateId)!;
      const deeper = deep.quests[index]!;
      if (template.unit === 'count') expect(deeper.target).toBe(quest.target);
      else expect(deeper.target).toBeGreaterThan(quest.target);
    }
  });

  it('keeps a "go deeper" weekly reachable for someone who has barely started', () => {
    const board = rollBoard('weekly', '2026-W34', { ...context, referenceFloor: 1 });
    for (const quest of board.quests) {
      if (questTemplate(quest.templateId)?.unit !== 'depth') continue;
      expect(quest.target).toBeGreaterThanOrEqual(QUEST_MIN_DEPTH_TARGET);
    }
  });

  it('pays more for a deeper hero, so a daily never becomes pocket change', () => {
    const shallow = rollBoard('daily', '2026-08-22', { ...context, referenceFloor: 5 });
    const deep = rollBoard('daily', '2026-08-22', { ...context, referenceFloor: 200 });
    expect(deep.quests[0]!.reward.gold).toBeGreaterThan(shallow.quests[0]!.reward.gold);
  });
});

describe('periods (Q10)', () => {
  it('keeps the board when the day has not turned over', () => {
    const quests = boards();
    expect(refreshBoards(quests, keysAt(NOW + 60_000), context)).toBe(quests);
  });

  it('rolls a new board when the day turns over', () => {
    const quests = boards();
    const next = refreshBoards(quests, keysAt(NOW + 3 * 86_400_000), context);
    expect(next.daily.periodKey).not.toBe(quests.daily.periodKey);
    expect(next.daily.quests.every((quest) => quest.progress === 0)).toBe(true);
  });

  it('re-opens nothing when the clock goes backwards', () => {
    const quests = boards();
    const rolledBack = refreshBoards(quests, keysAt(NOW - 5 * 86_400_000), context);

    // Identical object: a wound-back clock changes nothing at all, so a claimed
    // quest cannot be claimed again by moving the system date (Q10).
    expect(rolledBack).toBe(quests);
  });

  it('keeps a claim through the rest of its period', () => {
    let quests = boards();
    quests = { ...quests, daily: { ...quests.daily, quests: [...quests.daily.quests] } };
    const claimed = markClaimed(
      { ...quests, daily: { ...quests.daily, quests: completeAll(quests.daily.quests) } },
      'daily',
      0,
    );
    expect(claimed.daily.quests[0]!.claimed).toBe(true);

    const later = refreshBoards(claimed, keysAt(NOW + 3_600_000), context);
    expect(later.daily.quests[0]!.claimed).toBe(true);
  });
});

describe('progress', () => {
  it('counts only what the player actually did', () => {
    const template = templatesFor('daily').find((entry) => entry.objective === 'clearFloors')!;
    const board = { periodKey: '2026-08-22', quests: [quest(template.id, 3)] };
    let quests: QuestsState = { daily: board, weekly: { periodKey: '', quests: [] } };

    quests = recordEvent(quests, { kind: 'goldSpent', amount: 900 });
    expect(quests.daily.quests[0]!.progress).toBe(0);

    quests = recordEvent(quests, { kind: 'floorCleared', floor: 4, isBoss: false });
    expect(quests.daily.quests[0]!.progress).toBe(1);
  });

  it('treats reaching a floor as a high-water mark, not a tally', () => {
    const template = templatesFor('weekly', 'hard').find(
      (entry) => entry.objective === 'reachFloor',
    )!;
    let quests: QuestsState = {
      daily: { periodKey: '', quests: [] },
      weekly: { periodKey: '2026-W34', quests: [quest(template.id, 40)] },
    };

    quests = recordEvent(quests, { kind: 'floorCleared', floor: 30, isBoss: false });
    quests = recordEvent(quests, { kind: 'floorCleared', floor: 12, isBoss: false });
    expect(quests.weekly.quests[0]!.progress).toBe(30);
  });

  it('never counts past the target', () => {
    const template = templatesFor('daily').find((entry) => entry.objective === 'sellItems')!;
    let quests: QuestsState = {
      daily: { periodKey: '2026-08-22', quests: [quest(template.id, 2)] },
      weekly: { periodKey: '', quests: [] },
    };
    for (let index = 0; index < 10; index += 1) {
      quests = recordEvent(quests, { kind: 'itemSold' });
    }
    expect(quests.daily.quests[0]!.progress).toBe(2);
  });

  it('stops counting once claimed', () => {
    const template = templatesFor('daily').find((entry) => entry.objective === 'buyItems')!;
    const started: QuestsState = {
      daily: { periodKey: '2026-08-22', quests: [{ ...quest(template.id, 2), progress: 2 }] },
      weekly: { periodKey: '', quests: [] },
    };
    const claimed = markClaimed(started, 'daily', 0);
    const after = recordEvent(claimed, { kind: 'itemBought' });
    expect(after.daily.quests[0]!.progress).toBe(2);
  });
});

describe('claiming', () => {
  it('refuses a quest that is not finished', () => {
    const quests = boards();
    expect(markClaimed(quests, 'daily', 0)).toBe(quests);
  });

  it('counts what is waiting, for the notification dot (§20.5)', () => {
    const quests = boards();
    expect(claimableCount(quests)).toBe(0);

    const done: QuestsState = {
      ...quests,
      daily: { ...quests.daily, quests: completeAll(quests.daily.quests) },
    };
    expect(claimableCount(done)).toBe(QUEST_BOARD.daily);
  });

  it('cannot be claimed twice', () => {
    const quests = boards();
    const done: QuestsState = {
      ...quests,
      daily: { ...quests.daily, quests: completeAll(quests.daily.quests) },
    };

    const once = markClaimed(done, 'daily', 0);
    expect(isClaimable(once.daily.quests[0]!)).toBe(false);
    expect(markClaimed(once, 'daily', 0)).toBe(once);
  });
});

function quest(templateId: string, target: number) {
  return {
    templateId,
    target,
    progress: 0,
    claimed: false,
    reward: { gold: 0, xp: 0, materials: {}, items: [], tickets: 0, luckyTickets: 0 },
  };
}

function completeAll<T extends { target: number }>(quests: T[]): T[] {
  return quests.map((entry) => ({ ...entry, progress: entry.target }));
}

describe('completion', () => {
  it('is reached exactly at the target', () => {
    expect(isComplete({ ...quest('x', 5), progress: 4 })).toBe(false);
    expect(isComplete({ ...quest('x', 5), progress: 5 })).toBe(true);
  });
});

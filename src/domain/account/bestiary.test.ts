import { describe, expect, it } from 'vitest';
import { BOSSES, ENEMIES } from '@/content/enemies/index.ts';
import type { Account } from '@/domain/character/types.ts';
import { bestiaryEntries, bestiaryProgress, isFirstSighting, recordKills } from './bestiary.ts';

function account(bestiary: Record<string, number> = {}): Account {
  return {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: true,
    backpackSlots: 20,
    bestiary,
    echoes: 0,
    echoesEarned: 0,
    echoNodes: {},
    deeds: {},
    deedsClaimed: [],
    bossRushBest: 0,
    expeditions: {},
    pets: {},
  };
}

describe('the bestiary (Brief §4.3, Q12)', () => {
  it('lists the whole roster from the first visit, gaps included', () => {
    const entries = bestiaryEntries(account());

    expect(entries).toHaveLength(ENEMIES.length + BOSSES.length);
    // Nothing met yet, so nothing is named — the silhouettes are the invitation.
    expect(entries.every((entry) => !entry.seen)).toBe(true);
  });

  it('reads as a walk up the tower rather than as the content file', () => {
    const floors = bestiaryEntries(account()).map((entry) => entry.def.floors[0]);
    const sorted = [...floors].sort((a, b) => a - b);
    expect(floors).toEqual(sorted);
  });

  it('counts kills, and keeps counting them across runs', () => {
    const rat = ENEMIES[0]!;
    let held = account();

    held = recordKills(held, [rat.id, rat.id]);
    held = recordKills(held, [rat.id]);

    const entry = bestiaryEntries(held).find((row) => row.def.id === rat.id);
    expect(entry?.kills).toBe(3);
    expect(entry?.seen).toBe(true);
  });

  it('leaves the account alone when nothing was killed', () => {
    const held = account();
    expect(recordKills(held, [])).toBe(held);
  });

  it('marks the bosses as bosses, because they are a different kind of thing', () => {
    const gate = BOSSES[0]!;
    const entry = bestiaryEntries(account({ [gate.id]: 1 })).find((row) => row.def.id === gate.id);
    expect(entry?.isBoss).toBe(true);
  });

  it('says how much of the tower has been met', () => {
    const first = ENEMIES[0]!;
    const progress = bestiaryProgress(account({ [first.id]: 4 }));

    expect(progress.seen).toBe(1);
    expect(progress.total).toBe(ENEMIES.length + BOSSES.length);
  });

  it('knows a first sighting from a familiar face', () => {
    const first = ENEMIES[0]!;
    expect(isFirstSighting(account(), first.id)).toBe(true);
    expect(isFirstSighting(account({ [first.id]: 1 }), first.id)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  POWER_PER_TALENT_POINT,
  TALENT_CAP,
  TALENT_MAGNITUDE,
  TALENT_MAX_RANK,
  TALENT_RANK_COST,
  TALENT_TIER_UNLOCK,
} from '@/content/balance/talents.ts';
import { ALL_TALENTS, TALENT_TREES, talentsFor } from '@/content/talents/index.ts';
import { CLASS_IDS } from '@/domain/character/types.ts';
import { createCharacter, totalStatsOf } from '@/domain/character/character.ts';
import type { Character, ClassId } from '@/domain/character/types.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import {
  learnTalent,
  pointsAvailable,
  pointsSpent,
  rankCost,
  rankOf,
  respecCost,
  respecTalents,
  talentBonuses,
  talentPower,
  talentStats,
  talentTree,
  treeCost,
} from './talents.ts';

const NOW = 1_700_000_000_000;

function hero(overrides: Partial<Character> = {}, classId: ClassId = 'warrior'): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId,
      createdAt: NOW,
      runSeed: 'talent-test',
    }),
    ...overrides,
  };
}

/** A hero levelled far enough to buy whatever a test needs. */
function levelled(level: number, talents: Record<string, number> = {}): Character {
  const base = hero();
  return { ...base, progression: { ...base.progression, level }, talents };
}

/** Buy `count` ranks of one talent, failing loudly if the tree refuses. */
function learn(character: Character, id: string, count = 1): Character {
  let held = character;
  for (let index = 0; index < count; index += 1) {
    const next = learnTalent(held, id);
    if (typeof next === 'string') throw new Error(`${id} refused: ${next}`);
    held = next;
  }
  return held;
}

/** Fill every row above `tier`, so a test about a deep talent can reach it. */
function opened(tier: number): Character {
  let held = levelled(999);
  for (let row = 0; row < tier; row += 1) {
    for (const def of talentsFor('warrior').filter((node) => node.tier === row)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
  }
  return held;
}

describe('the shape of every tree (Q38)', () => {
  it('gives all five classes a tree of the same size', () => {
    const sizes = CLASS_IDS.map((id) => talentsFor(id).length);
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBeGreaterThan(8);
  });

  it('never lets a talent claim a class that is not its own', () => {
    for (const id of CLASS_IDS) {
      for (const def of TALENT_TREES[id]) expect(def.classId).toBe(id);
    }
  });

  it('keeps every id unique across the whole game', () => {
    expect(new Set(ALL_TALENTS.map((def) => def.id)).size).toBe(ALL_TALENTS.length);
  });

  it('never grants Speed, which only gear can (Brief §6)', () => {
    // Enforced by the type system too — this is the runtime proof that no data
    // file found a way around it.
    for (const def of ALL_TALENTS) {
      if (def.effect.kind === 'stat') expect(def.effect.stat).not.toBe('speed');
    }
  });

  it('prices every tier it uses, and opens every tier it prices', () => {
    for (const id of CLASS_IDS) {
      for (const def of talentsFor(id)) {
        expect(TALENT_RANK_COST[def.tier]).toBeGreaterThan(0);
        expect(TALENT_TIER_UNLOCK[def.tier]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('makes deeper rows cost more and open later', () => {
    for (let tier = 1; tier < TALENT_RANK_COST.length; tier += 1) {
      expect(TALENT_RANK_COST[tier]!).toBeGreaterThan(TALENT_RANK_COST[tier - 1]!);
      expect(TALENT_TIER_UNLOCK[tier]!).toBeGreaterThan(TALENT_TIER_UNLOCK[tier - 1]!);
    }
  });

  it('opens the first row to a hero who has spent nothing', () => {
    // Or a brand-new hero would arrive at a screen with nothing to press.
    expect(TALENT_TIER_UNLOCK[0]).toBe(0);
    expect(talentTree(levelled(1)).some((node) => node.learnable)).toBe(true);
  });

  it('is a long climb rather than a formality', () => {
    for (const id of CLASS_IDS) expect(treeCost(id)).toBeGreaterThan(100);
  });
});

describe('earning and spending points (Q38)', () => {
  it('pays one point per level', () => {
    expect(pointsAvailable(levelled(1))).toBe(1);
    expect(pointsAvailable(levelled(40))).toBe(40);
  });

  it('charges the tier price, rank by rank', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    let held = levelled(40);

    for (let rank = 0; rank < TALENT_MAX_RANK; rank += 1) {
      const before = pointsAvailable(held);
      held = learn(held, first.id);
      expect(before - pointsAvailable(held)).toBe(rankCost(0));
    }

    expect(rankOf(held, first.id)).toBe(TALENT_MAX_RANK);
    expect(learnTalent(held, first.id)).toBe('maxRank');
  });

  it('refuses in words rather than in silence', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    const deep = talentsFor('warrior').find((def) => def.tier === 3)!;

    expect(learnTalent(levelled(0), first.id)).toBe('notEnoughPoints');
    expect(learnTalent(levelled(999), 'talent.nonesuch')).toBe('noSuchTalent');
    // A row nobody has worked towards is shut, however many points are in hand.
    expect(learnTalent(levelled(999), deep.id)).toBe('tierLocked');
  });

  it('refuses another class’s talent outright', () => {
    const mageTalent = talentsFor('mage')[0]!;
    expect(learnTalent(levelled(999), mageTalent.id)).toBe('wrongClass');
  });

  it('opens a deeper row once enough is committed to the shallow ones', () => {
    let held = levelled(999);
    for (const def of talentsFor('warrior').filter((node) => node.tier === 0)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
    for (const def of talentsFor('warrior').filter((node) => node.tier === 1)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }

    const third = talentsFor('warrior').find((def) => def.tier === 2)!;
    expect(pointsSpent(held)).toBeGreaterThanOrEqual(TALENT_TIER_UNLOCK[2]!);
    expect(typeof learnTalent(held, third.id)).toBe('object');
  });

  it('ignores a rank a future build wrote above the ceiling', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    expect(rankOf(levelled(999, { [first.id]: 99 }), first.id)).toBe(TALENT_MAX_RANK);
  });

  it('ignores a talent belonging to another class in a stored save', () => {
    // Impossible through the game, but a save is data and data can be wrong.
    const mageTalent = talentsFor('mage')[0]!;
    expect(pointsSpent(levelled(999, { [mageTalent.id]: 3 }))).toBe(0);
  });
});

describe('unlearning (Q38)', () => {
  it('costs nothing and refuses when nothing has been learned', () => {
    const fresh = levelled(10);
    expect(respecCost(fresh)).toBe(0);
    expect(respecTalents(fresh)).toBe('nothingLearned');
  });

  it('gets dearer the deeper the investment', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    const one = learn(levelled(99), first.id);
    const five = learn(levelled(99), first.id, 5);

    expect(respecCost(one)).toBeGreaterThan(0);
    expect(respecCost(five)).toBeGreaterThan(respecCost(one));
  });

  it('refuses a purse that cannot pay, and says so', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    const spent = learn(levelled(99), first.id, 5);
    const broke = { ...spent, currencies: { ...spent.currencies, gold: 0 } };
    expect(respecTalents(broke)).toBe('notEnoughGold');
  });

  it('returns every point and takes the gold', () => {
    const first = talentsFor('warrior').find((def) => def.tier === 0)!;
    const spent = learn(levelled(99), first.id, 3);
    const rich = { ...spent, currencies: { ...spent.currencies, gold: 10_000_000 } };
    const cost = respecCost(rich);

    const after = respecTalents(rich);
    if (typeof after === 'string') throw new Error(after);

    expect(after.talents).toEqual({});
    expect(pointsAvailable(after)).toBe(pointsAvailable(levelled(99)));
    expect(rich.currencies.gold - after.currencies.gold).toBe(cost);
  });
});

describe('what a tree is worth (Q38)', () => {
  it('is neutral for a hero who has spent nothing', () => {
    const bonuses = talentBonuses(levelled(50));
    expect(bonuses.gold).toBe(1);
    expect(bonuses.xp).toBe(1);
    expect(bonuses.materials).toBe(1);
    expect(bonuses.signature).toBe(0);
    expect(bonuses.damageReduction).toBe(0);
    for (const stat of Object.values(bonuses.stats)) expect(stat).toBe(0);
  });

  it('is neutral for no hero at all', () => {
    expect(talentBonuses(null).gold).toBe(1);
    expect(talentBonuses(undefined).critDamage).toBe(0);
  });

  it('raises the stat its talent names, and only that one', () => {
    const brawn = talentsFor('warrior').find(
      (def) => def.effect.kind === 'stat' && def.effect.stat === 'strength',
    )!;
    const bonuses = talentBonuses(learn(levelled(99), brawn.id, 3));

    expect(bonuses.stats.strength).toBeCloseTo(3 * TALENT_MAGNITUDE.statPercent);
    expect(bonuses.stats.defense).toBe(0);
    expect(bonuses.stats.luck).toBe(0);
  });

  it('adds a share of what the hero already has, never a flat number', () => {
    const durable = { strength: 200, defense: 100, hp: 1000, resource: 50, luck: 40, speed: 30 };
    const brawn = talentsFor('warrior').find(
      (def) => def.effect.kind === 'stat' && def.effect.stat === 'strength',
    )!;
    const bonuses = talentBonuses(learn(levelled(99), brawn.id, 2));
    const added = talentStats(durable, bonuses);

    expect(added.strength).toBe(Math.round(200 * 2 * TALENT_MAGNITUDE.statPercent));
    expect(added.defense).toBe(0);
  });

  it('cannot touch Speed, whatever the durable block holds', () => {
    const durable = { strength: 200, defense: 100, hp: 1000, resource: 50, luck: 40, speed: 400 };
    let held = levelled(999);
    for (const def of talentsFor('warrior').filter((node) => node.tier === 0)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
    expect(talentStats(durable, talentBonuses(held)).speed).toBe(0);
  });

  it('reaches the hero through the stat total the rest of the game reads', () => {
    const brawn = talentsFor('warrior').find(
      (def) => def.effect.kind === 'stat' && def.effect.stat === 'strength',
    )!;
    const plain = levelled(99);
    const talented = learn(plain, brawn.id, TALENT_MAX_RANK);

    expect(totalStatsOf(talented).strength).toBeGreaterThan(totalStatsOf(plain).strength);
    // Every other stat is untouched, so the tree is a choice rather than a bonus.
    for (const stat of STAT_IDS.filter((id) => id !== 'strength')) {
      expect(totalStatsOf(talented)[stat]).toBe(totalStatsOf(plain)[stat]);
    }
  });

  it('never lets mitigation walk to immunity, whatever is bought', () => {
    // Two Warrior talents name the same lever. Both maxed must still respect
    // the clamp, or the band-relative combat model stops working (COMBAT.md §2).
    let held = levelled(999);
    for (const def of talentsFor('warrior').filter((node) => node.tier === 0)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
    for (const def of talentsFor('warrior').filter((node) => node.tier === 1)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
    for (const def of talentsFor('warrior').filter((node) => node.tier === 2)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }
    for (const def of talentsFor('warrior').filter((node) => node.tier === 3)) {
      held = learn(held, def.id, TALENT_MAX_RANK);
    }

    expect(talentBonuses(held).damageReduction).toBeLessThanOrEqual(TALENT_CAP.damageReduction);
  });

  it('never promises a rank a cap would swallow', () => {
    // The card prints `step`, so `step` has to be the *actual* gain.
    const guard = talentsFor('warrior').find((def) => def.effect.kind === 'damageReduction')!;
    const held = learn(opened(guard.tier), guard.id, TALENT_MAX_RANK - 1);

    const node = talentTree(held).find((entry) => entry.def.id === guard.id)!;
    expect(node.effect + node.step).toBeLessThanOrEqual(TALENT_CAP.damageReduction);
  });
});

describe('talents and the bracket (Brief §13)', () => {
  it('counts a talent the bracket cannot otherwise see', () => {
    const rule = talentsFor('warrior').find((def) => def.tier === 1 && def.effect.kind !== 'stat')!;
    const base = opened(rule.tier);
    const held = learn(base, rule.id, 2);

    expect(talentPower(held) - talentPower(base)).toBe(
      2 * rankCost(rule.tier) * POWER_PER_TALENT_POINT,
    );
  });

  it('does not count a stat talent twice', () => {
    // Its value already reaches the bracket through the hero's stat total, and
    // counting it here as well would inflate the bracket — the direction §13
    // exists to prevent.
    const brawn = talentsFor('warrior').find(
      (def) => def.effect.kind === 'stat' && def.effect.stat === 'strength',
    )!;
    expect(talentPower(learn(levelled(99), brawn.id, 4))).toBe(0);
  });

  it('is zero for a hero with no tree, and for no hero at all', () => {
    expect(talentPower(levelled(50))).toBe(0);
    expect(talentPower(null)).toBe(0);
  });
});

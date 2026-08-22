import { describe, expect, it } from 'vitest';
import type { GrowableStats } from '../stats.ts';
import {
  affordableStatPoints,
  allStatUpgradeCosts,
  buyStatPoints,
  statUpgradeCost,
} from './statUpgrades.ts';

const NONE: GrowableStats = { strength: 0, defense: 0, hp: 0, resource: 0, luck: 0 };

describe('statUpgradeCost', () => {
  it('rises with every point already bought', () => {
    let previous = 0;
    for (let owned = 0; owned < 60; owned += 1) {
      const cost = statUpgradeCost('strength', owned);
      expect(cost).toBeGreaterThanOrEqual(previous);
      previous = cost;
    }
    expect(statUpgradeCost('strength', 60)).toBeGreaterThan(statUpgradeCost('strength', 0) * 10);
  });

  it('never reaches a ceiling — there is always another point (A2)', () => {
    expect(statUpgradeCost('strength', 500)).toBeGreaterThan(statUpgradeCost('strength', 400));
    expect(Number.isFinite(statUpgradeCost('strength', 1_000))).toBe(true);
  });

  it('prices health cheaply per point and luck dearly', () => {
    expect(statUpgradeCost('hp', 0)).toBeLessThan(statUpgradeCost('strength', 0));
    expect(statUpgradeCost('luck', 0)).toBeGreaterThan(statUpgradeCost('strength', 0));
  });

  it('never costs nothing', () => {
    expect(statUpgradeCost('hp', 0)).toBeGreaterThanOrEqual(1);
  });

  it('quotes every buyable stat, and Speed is not among them (§6)', () => {
    const costs = allStatUpgradeCosts(NONE);
    expect(Object.keys(costs).sort()).toEqual(['defense', 'hp', 'luck', 'resource', 'strength']);
    // `speed` is not merely missing — `UpgradableStatId` makes it unnameable here.
    expect(Object.keys(costs)).not.toContain('speed');
  });
});

describe('buyStatPoints', () => {
  it('buys one point and charges for it', () => {
    const price = statUpgradeCost('strength', 0);
    const result = buyStatPoints(NONE, 'strength', price);

    expect(result.pointsBought).toBe(1);
    expect(result.goldSpent).toBe(price);
    expect(result.purchased.strength).toBe(1);
  });

  it('buys nothing when the gold is short', () => {
    const result = buyStatPoints(NONE, 'strength', statUpgradeCost('strength', 0) - 1);
    expect(result).toEqual({ purchased: NONE, goldSpent: 0, pointsBought: 0 });
  });

  it('charges each point at its own escalating price', () => {
    // Buying ten at once must cost exactly what ten single purchases cost — a
    // hidden bulk discount is a bug nobody reports and everybody uses.
    let stepwise = 0;
    let owned = NONE;
    for (let index = 0; index < 10; index += 1) {
      const price = statUpgradeCost('strength', owned.strength);
      stepwise += price;
      owned = buyStatPoints(owned, 'strength', price).purchased;
    }

    const bulk = buyStatPoints(NONE, 'strength', stepwise, 10);
    expect(bulk.pointsBought).toBe(10);
    expect(bulk.goldSpent).toBe(stepwise);
    expect(bulk.purchased.strength).toBe(10);
  });

  it('stops when the gold runs out mid-purchase', () => {
    const first = statUpgradeCost('strength', 0);
    const second = statUpgradeCost('strength', 1);
    const result = buyStatPoints(NONE, 'strength', first + second - 1, 5);

    expect(result.pointsBought).toBe(1);
    expect(result.goldSpent).toBe(first);
  });

  it('leaves other stats alone', () => {
    const result = buyStatPoints(NONE, 'luck', 1_000_000, 3);
    expect(result.purchased.strength).toBe(0);
    expect(result.purchased.luck).toBe(3);
  });

  it('does not mutate what it is given', () => {
    const owned = { ...NONE };
    buyStatPoints(owned, 'strength', 1_000_000, 5);
    expect(owned.strength).toBe(0);
  });
});

describe('affordableStatPoints', () => {
  it('reports how far a pile of gold goes', () => {
    const gold = statUpgradeCost('hp', 0) + statUpgradeCost('hp', 1);
    expect(affordableStatPoints(NONE, 'hp', gold)).toBe(2);
  });

  it('is zero when nothing is affordable', () => {
    expect(affordableStatPoints(NONE, 'strength', 0)).toBe(0);
  });

  it('terminates on an absurd amount of gold', () => {
    // Exponential costs bound the loop; this guards against a config change
    // that flattens the curve and turns this into an infinite loop.
    expect(affordableStatPoints(NONE, 'strength', 1e15)).toBeLessThan(2_000);
  });
});

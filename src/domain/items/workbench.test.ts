import { describe, expect, it } from 'vitest';
import { BREW_MATERIAL_COST, TRANSMUTE_RATE } from '@/content/balance/items.ts';
import { MATERIALS, MAX_MATERIAL_TIER, materialIdForTier } from '@/content/items/materials.ts';
import { brewCost, canBrew, spendBrew, transmute, transmuteLadder } from './workbench.ts';

const DUST = materialIdForTier(0);
const SIGIL = materialIdForTier(1);
const DEEPEST = materialIdForTier(MAX_MATERIAL_TIER);

describe('the workbench — transmuting (Q43)', () => {
  it('shows every rung, including the ones the player cannot reach yet', () => {
    const ladder = transmuteLadder({});

    // One rung per material except the deepest: there is nothing above it.
    expect(ladder).toHaveLength(MATERIALS.length - 1);
    expect(ladder.every((step) => step.affordable === 0)).toBe(true);
    expect(ladder.some((step) => step.from.id === DEEPEST)).toBe(false);
  });

  it('says how close each rung is rather than hiding it', () => {
    const ladder = transmuteLadder({ [DUST]: TRANSMUTE_RATE * 2 + 1 });
    const rung = ladder.find((step) => step.from.id === DUST);

    expect(rung?.held).toBe(TRANSMUTE_RATE * 2 + 1);
    expect(rung?.affordable).toBe(2);
  });

  it('melts five down into one of the tier above', () => {
    const result = transmute({ [DUST]: TRANSMUTE_RATE }, DUST);
    if (typeof result === 'string') throw new Error(result);

    expect(result.materials[DUST]).toBe(0);
    expect(result.materials[SIGIL]).toBe(1);
    expect(result.made.id).toBe(SIGIL);
    expect(result.count).toBe(1);
  });

  it('clamps a bulk press to what the pouch actually covers', () => {
    // Asked for eighty, can do three: "you asked for eighty and can do three"
    // has an obviously right answer, and it is not a refusal.
    const held = TRANSMUTE_RATE * 3 + 2;
    const result = transmute({ [DUST]: held }, DUST, 80);
    if (typeof result === 'string') throw new Error(result);

    expect(result.count).toBe(3);
    expect(result.materials[DUST]).toBe(2);
    expect(result.materials[SIGIL]).toBe(3);
  });

  it('is a rescue, never a farm: the rate loses value on purpose', () => {
    // Five to one compounds to 3,125 to one across five tiers. Whatever the
    // rate becomes, it must never be one that pays to climb *down* for.
    expect(TRANSMUTE_RATE).toBeGreaterThan(1);
  });

  it('refuses in words rather than in silence', () => {
    expect(transmute({ [DUST]: TRANSMUTE_RATE - 1 }, DUST)).toBe('notEnoughMaterials');
    expect(transmute({ [DEEPEST]: 500 }, DEEPEST)).toBe('atCeiling');
    expect(transmute({}, 'mat.nonesuch')).toBe('noSuchMaterial');
  });

  it('leaves every other material alone', () => {
    const result = transmute({ [DUST]: TRANSMUTE_RATE, [SIGIL]: 7 }, DUST);
    if (typeof result === 'string') throw new Error(result);
    expect(result.materials[SIGIL]).toBe(8);
  });
});

describe('the workbench — brewing (Q43)', () => {
  it('asks for the material of the depth the hero is at', () => {
    expect(brewCost(3)).toEqual({ materialId: materialIdForTier(3), count: BREW_MATERIAL_COST });
  });

  it('knows whether the pouch covers it', () => {
    expect(canBrew({ [DUST]: BREW_MATERIAL_COST }, 0)).toBe(true);
    expect(canBrew({ [DUST]: BREW_MATERIAL_COST - 1 }, 0)).toBe(false);
    expect(canBrew({}, 0)).toBe(false);
  });

  it('spends exactly what it asked for', () => {
    const after = spendBrew({ [DUST]: BREW_MATERIAL_COST + 3, [SIGIL]: 2 }, 0);
    expect(after[DUST]).toBe(3);
    expect(after[SIGIL]).toBe(2);
  });
});

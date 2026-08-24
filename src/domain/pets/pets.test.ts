import { describe, expect, it } from 'vitest';
import {
  PET_AURA,
  PET_MAX_LEVEL,
  PET_SCALE,
  PET_TAUNT_CAP,
  POWER_PER_PET_LEVEL,
} from '@/content/balance/pets.ts';
import { PETS, getPet } from '@/content/pets/index.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import { createCharacter } from '@/domain/character/character.ts';
import type { Account, Character } from '@/domain/character/types.ts';
import {
  activePetOf,
  auraEffect,
  auraMagnitude,
  awardPetXp,
  grantPets,
  ownedPet,
  ownedPets,
  petPower,
  petScale,
  petStats,
  petTaunt,
  petXpForFloor,
  petXpToNext,
  petsFoundAt,
  setActivePet,
  type OwnedPet,
} from './pets.ts';

const NOW = 1_700_000_000_000;
const HERO_STATS = { strength: 200, defense: 120, hp: 2000, resource: 60, luck: 80, speed: 40 };

function account(overrides: Partial<Account> = {}): Account {
  return {
    battleSpeedTier: 0,
    slotsUnlocked: 1,
    activeSlotId: 1,
    tutorialCompleted: true,
    backpackSlots: STARTING_BACKPACK_SLOTS,
    bestiary: {},
    echoes: 0,
    echoesEarned: 0,
    echoNodes: {},
    deeds: {},
    deedsClaimed: [],
    bossRushBest: 0,
    expeditions: {},
    pets: {},
    ...overrides,
  };
}

function hero(overrides: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      slotId: 1,
      name: 'Grimhild',
      classId: 'warrior',
      createdAt: NOW,
      runSeed: 'pet-test',
    }),
    ...overrides,
  };
}

const FIRST = PETS[0]!;

describe('the roster (Q42)', () => {
  it('spreads the species across a long climb rather than handing them over at once', () => {
    const floors = PETS.map((def) => def.unlockFloor);
    expect(new Set(floors).size).toBe(PETS.length);
    expect(Math.min(...floors)).toBeGreaterThan(0);
    expect(Math.max(...floors)).toBeGreaterThan(200);
  });

  it('gives every species a unique id and a distinct look', () => {
    expect(new Set(PETS.map((def) => def.id)).size).toBe(PETS.length);
    expect(new Set(PETS.map((def) => def.avatar)).size).toBe(PETS.length);
  });

  it('never lets a companion raise the hero’s Speed (Brief §6)', () => {
    // Gear is Speed's only source. The aura type cannot express one, and this is
    // the runtime proof that no species found a way around it.
    for (const def of PETS) {
      if (def.aura.kind === 'statScale') expect(def.aura.stat).not.toBe('speed');
    }
  });

  it('keeps every species inside the attention it is allowed to hold', () => {
    for (const def of PETS) expect(def.taunt).toBeLessThanOrEqual(PET_TAUNT_CAP);
  });

  it('makes each species a different bargain, not the same one at a different size', () => {
    // A roster where the newest is simply the best has one companion in it.
    const guardian = PETS.reduce((best, def) => (def.taunt > best.taunt ? def : best));
    const striker = PETS.reduce((best, def) =>
      def.ratios.strength > best.ratios.strength ? def : best,
    );
    expect(guardian.id).not.toBe(striker.id);
  });
});

describe('finding and fielding one (Q42)', () => {
  it('reports the species a depth frees, and only the ones not already met', () => {
    const fresh = account();
    expect(petsFoundAt(fresh, FIRST.unlockFloor).map((def) => def.id)).toContain(FIRST.id);

    const met = grantPets(fresh, [FIRST]);
    expect(petsFoundAt(met, FIRST.unlockFloor).map((def) => def.id)).not.toContain(FIRST.id);
  });

  it('leaves the account alone when a floor freed nothing', () => {
    const held = account();
    expect(grantPets(held, [])).toBe(held);
    expect(petsFoundAt(held, FIRST.unlockFloor - 1)).toHaveLength(0);
  });

  it('starts a found companion at level one', () => {
    const met = grantPets(account(), [FIRST]);
    expect(ownedPet(met, FIRST.id)?.level).toBe(1);
    expect(ownedPets(met)).toHaveLength(1);
  });

  it('sends one out and calls it back', () => {
    const met = grantPets(account(), [FIRST]);
    const out = setActivePet(met, hero(), FIRST.id);
    if (typeof out === 'string') throw new Error(out);

    expect(out.activePet).toBe(FIRST.id);
    expect(activePetOf(met, out)?.def.id).toBe(FIRST.id);

    const back = setActivePet(met, out, null);
    if (typeof back === 'string') throw new Error(back);
    expect(back.activePet).toBeNull();
    expect(activePetOf(met, back)).toBeNull();
  });

  it('refuses in words rather than in silence', () => {
    expect(setActivePet(account(), hero(), 'pet.nonesuch')).toBe('noSuchPet');
    // Real species, never met: a different answer, and it says so.
    expect(setActivePet(account(), hero(), FIRST.id)).toBe('notFound');
  });

  it('forgets a companion the account no longer owns rather than fielding a ghost', () => {
    // A save could name one the roster does not hold; the fight must not start
    // with a unit nobody can describe.
    const orphaned = hero({ activePet: FIRST.id });
    expect(activePetOf(account(), orphaned)).toBeNull();
  });
});

describe('growing one (Q42)', () => {
  it('pays deeper floors more', () => {
    expect(petXpForFloor(200)).toBeGreaterThan(petXpForFloor(20));
    expect(petXpForFloor(1)).toBeGreaterThan(0);
  });

  it('carries several levels at once when a floor pays enough', () => {
    const met = grantPets(account(), [FIRST]);
    const grown = awardPetXp(met, FIRST.id, 1_000_000);
    expect(grown.levelsGained).toBeGreaterThan(1);
    expect(ownedPet(grown.account, FIRST.id)!.level).toBeGreaterThan(2);
  });

  it('only pays the one that fought', () => {
    const met = grantPets(account(), PETS.slice(0, 2));
    const grown = awardPetXp(met, PETS[0]!.id, 500);
    expect(ownedPet(grown.account, PETS[1]!.id)!.xp).toBe(0);
  });

  it('does nothing for no companion, or for nothing earned', () => {
    const met = grantPets(account(), [FIRST]);
    expect(awardPetXp(met, null, 500).account).toBe(met);
    expect(awardPetXp(met, FIRST.id, 0).account).toBe(met);
  });

  it('stops at the ceiling rather than banking a bar that never fills', () => {
    const met = grantPets(account(), [FIRST]);
    const maxed = awardPetXp(met, FIRST.id, 10 ** 12);
    const pet = ownedPet(maxed.account, FIRST.id)!;

    expect(pet.level).toBe(PET_MAX_LEVEL);
    expect(pet.toNext).toBeNull();
    expect(pet.xp).toBe(0);
    expect(petXpToNext(PET_MAX_LEVEL)).toBeNull();
  });

  it('clamps a level a future build wrote above the ceiling', () => {
    const tampered = account({ pets: { [FIRST.id]: { level: 999, xp: 0 } } });
    expect(ownedPet(tampered, FIRST.id)!.level).toBe(PET_MAX_LEVEL);
  });
});

describe('what a companion brings to a fight (Q42)', () => {
  /** The first species at a given level, without going through the account. */
  const pet = (level: number): OwnedPet => ({
    def: FIRST,
    level,
    xp: 0,
    toNext: petXpToNext(level),
  });

  it('is a fraction of the hero, and a bigger one as it grows', () => {
    expect(petScale(1)).toBeCloseTo(PET_SCALE.atLevelOne);
    expect(petScale(PET_MAX_LEVEL)).toBeCloseTo(PET_SCALE.atMaxLevel);
    expect(petScale(25)).toBeGreaterThan(petScale(5));
  });

  it('never out-fights the hero it walks beside', () => {
    // The point of a companion is that it helps. A pet that hit harder than the
    // hero would make the hero the sidekick.
    const grown = petStats(HERO_STATS, pet(PET_MAX_LEVEL));
    expect(grown.strength).toBeLessThan(HERO_STATS.strength);
    expect(grown.hp).toBeLessThan(HERO_STATS.hp);
  });

  it('carries no resource pool, because signatures are the hero’s dial (Q26)', () => {
    expect(petStats(HERO_STATS, pet(PET_MAX_LEVEL)).resource).toBe(0);
  });

  it('still lands a blow at level one against a bare hero', () => {
    const tiny = petStats(
      { strength: 1, defense: 0, hp: 1, resource: 0, luck: 0, speed: 0 },
      pet(1),
    );
    expect(tiny.strength).toBeGreaterThan(0);
    expect(tiny.hp).toBeGreaterThan(0);
  });

  it('gives an aura that grows with the level and never breaks its ceiling', () => {
    const moth = PETS.find((def) => def.aura.kind === 'damageReduction')!;
    const one = auraMagnitude({ def: moth, level: 1, xp: 0, toNext: 1 });
    const maxed = auraMagnitude({ def: moth, level: PET_MAX_LEVEL, xp: 0, toNext: null });

    expect(maxed).toBeGreaterThan(one);
    expect(maxed).toBeLessThanOrEqual(PET_AURA.damageReductionCap);
  });

  it('expresses its aura as an ordinary whole-fight buff', () => {
    const effect = auraEffect(pet(10));
    expect(effect.duration).toBe('wholeFight');
    expect(effect.tone).toBe('buff');
    expect(effect.magnitude).toBeGreaterThan(0);
  });

  it('is counted by Power Level, so the bracket knows what is being fielded (§13)', () => {
    expect(petPower(null)).toBe(0);
    expect(petPower(pet(10))).toBe(10 * POWER_PER_PET_LEVEL);
    expect(petPower(pet(PET_MAX_LEVEL))).toBeGreaterThan(petPower(pet(1)));
  });

  it('holds only the share of attention its species is allowed', () => {
    for (const def of PETS) {
      expect(petTaunt({ def, level: 1, xp: 0, toNext: 1 })).toBeLessThanOrEqual(PET_TAUNT_CAP);
    }
  });

  it('resolves a species by id, and refuses an invented one', () => {
    expect(getPet(FIRST.id)?.id).toBe(FIRST.id);
    expect(getPet('pet.nonesuch')).toBeUndefined();
  });
});

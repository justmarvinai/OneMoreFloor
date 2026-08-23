/**
 * The balance simulator (BALANCE.md §10).
 *
 * A headless harness over the **real** domain code — the same combat resolution,
 * the same floor generator, the same reward rolls. Never a parallel model: a
 * simulator that approximates the game tells you about the approximation.
 *
 * At M3 this is the smoke-level harness the milestone calls for. M9 tunes
 * against it, adding the archetypes and gates in BALANCE.md §10.
 *
 *   npx vitest run tools/sim            # the harness's own tests
 *   npm run sim                         # a run, printed
 */
import { createRng } from '@/app/rng.ts';
import { createCharacter, totalStatsOf } from '@/domain/character/character.ts';
import type { Character, ClassId } from '@/domain/character/types.ts';
import { canEquip } from '@/domain/items/equip.ts';
import { requireItemDef } from '@/content/items/index.ts';
import { fightFloor, quickRaid } from '@/domain/tower/run.ts';

/**
 * A fixed instant. Nothing here drinks potions, and pinning the clock is what
 * keeps these fights byte-identical between runs (ARCHITECTURE §5).
 */
const NOW = 1_700_000_000_000;

export interface SimOptions {
  classId: ClassId;
  /** How many attempts at the tower to simulate. */
  runs: number;
  /** Give up on a run past this floor, so a broken curve cannot hang the sim. */
  floorCap?: number;
  seed?: string;
  /**
   * Whether the archetype equips what it finds. `false` models a player who
   * never opens their bag — a useful floor on how bad things can get.
   */
  equipsDrops?: boolean;
}

export interface RunReport {
  run: number;
  /** Deepest floor cleared in this attempt. */
  reachedFloor: number;
  fights: number;
  goldEarned: number;
  levelsGained: number;
}

export interface SimReport {
  classId: ClassId;
  runs: RunReport[];
  /** Where the first run ended — the early-game death wall (BALANCE.md §10). */
  firstDeathFloor: number;
  deepestFloor: number;
  totalFights: number;
  finalLevel: number;
  finalPower: number;
}

/**
 * Equip a dropped item when it is both usable and better than what is worn.
 * "Better" is budget-based, which matches how the game values gear itself.
 */
function maybeEquip(character: Character): Character {
  let current = character;

  for (const item of character.inventory) {
    const def = requireItemDef(item.defId);
    const mainhand = current.equipment.mainhand;
    const check = canEquip(def, def.slot, {
      classId: current.identity.classId,
      ascension: current.progression.ascension,
      mainhand: mainhand ? requireItemDef(mainhand.defId) : null,
    });
    if (!check.ok) continue;

    const worn = current.equipment[def.slot];
    if (worn && worn.budget >= item.budget) continue;

    current = {
      ...current,
      equipment: { ...current.equipment, [def.slot]: item },
      inventory: current.inventory.filter((held) => held.uid !== item.uid),
    };
  }

  return current;
}

/** Simulate one archetype's climb, run after run, and report what happened. */
export function simulate(options: SimOptions): SimReport {
  const { classId, runs, floorCap = 400, seed = 'sim', equipsDrops = true } = options;

  let character = createCharacter({
    slotId: 1,
    name: 'Simulacrum',
    classId,
    createdAt: 0,
    runSeed: createRng(`${seed}:${classId}`).next().toString(36),
  });

  const reports: RunReport[] = [];
  let totalFights = 0;
  let firstDeathFloor = 0;

  for (let run = 1; run <= runs; run += 1) {
    const startGold = character.currencies.gold;
    const startLevel = character.progression.level;
    let fights = 0;

    // Re-climb what is already beaten, then push into the unknown (Brief §1).
    if (character.tower.highestFloorEverCleared > 0) {
      const raid = quickRaid(character, character.tower.highestFloorEverCleared, NOW);
      character = raid.character;
      fights += raid.floors.length;
      if (raid.died) {
        reports.push(runReport(run, raid.reachedFloor, fights, startGold, startLevel));
        continue;
      }
    }

    while (character.tower.currentRunFloor <= floorCap) {
      const floor = character.tower.currentRunFloor;
      const result = fightFloor(character, floor, NOW);
      character = result.character;
      fights += 1;

      if (!result.cleared) {
        if (firstDeathFloor === 0) firstDeathFloor = floor;
        break;
      }

      // Levels are applied by the clear itself; gear is the archetype's choice.
      if (equipsDrops) character = maybeEquip(character);
    }

    reports.push(
      runReport(run, character.tower.highestFloorEverCleared, fights, startGold, startLevel),
    );
    totalFights += fights;
  }

  return {
    classId,
    runs: reports,
    firstDeathFloor,
    deepestFloor: character.tower.highestFloorEverCleared,
    totalFights,
    finalLevel: character.progression.level,
    finalPower: totalStatsOf(character).strength,
  };

  function runReport(
    run: number,
    reachedFloor: number,
    fights: number,
    startGold: number,
    startLevel: number,
  ): RunReport {
    return {
      run,
      reachedFloor,
      fights,
      goldEarned: character.currencies.gold - startGold,
      levelsGained: character.progression.level - startLevel,
    };
  }
}

/** Run every class through the same number of attempts, for a parity read. */
export function simulateAllClasses(runs = 3, seed = 'parity'): SimReport[] {
  return (['warrior', 'mage', 'hunter', 'bard', 'swashbuckler'] as const).map((classId) =>
    simulate({ classId, runs, seed }),
  );
}

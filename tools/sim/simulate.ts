/**
 * The balance simulator (BALANCE.md §10).
 *
 * A headless harness over the **real** domain code — the same combat resolution,
 * the same floor generator, the same reward rolls, the same shops. Never a
 * parallel model: a simulator that approximates the game tells you about the
 * approximation.
 *
 * M9 is what this was built for. The harness now plays *archetypes* — scripted
 * players with different habits — across sessions, and records the readings the
 * §10 gates are written against: where the wall is, how long the re-climb takes,
 * whether gold stays short, when Legendary first shows up, how often a ticket
 * arrives, and whether the round cap ever fires.
 *
 *   npm run sim                         # the gates, run
 *   npx vitest run tools/sim            # the same, verbosely
 */
import { createRng } from '@/app/rng.ts';
import { createCharacter, equippedItems, powerInputsFor } from '@/domain/character/character.ts';
import type { Character, ClassId } from '@/domain/character/types.ts';
import { CLASS_IDS } from '@/domain/character/types.ts';
import { canEquip } from '@/domain/items/equip.ts';
import { requireItemDef } from '@/content/items/index.ts';
import {
  canLevelUp,
  gearLevelCost,
  gearLevelCostToMax,
  levelUp,
  sellValue,
} from '@/domain/items/upgrade.ts';
import { STARTING_BACKPACK_SLOTS } from '@/content/balance/account.ts';
import {
  affordableStatPoints,
  buyStatPoints,
  statUpgradeCost,
} from '@/domain/economy/statUpgrades.ts';
import { UPGRADABLE_STAT_IDS, type UpgradableStatId } from '@/domain/stats.ts';
import {
  MERCHANT_IDS,
  buyPrice,
  needsRestock,
  restock,
  stockOf,
} from '@/domain/merchants/merchants.ts';
import { powerLevel } from '@/domain/power/power.ts';
import { bracketFor } from '@/domain/power/brackets.ts';
import type { Rarity } from '@/domain/items/types.ts';
import { rarityIndex } from '@/domain/items/types.ts';
import { bracketForCharacter, fightFloor, applyDeath, quickRaid } from '@/domain/tower/run.ts';
import type { CombatScript } from '@/domain/combat/types.ts';

/**
 * A fixed instant, advanced explicitly by the sim so merchant restocks happen on
 * the schedule a real player would see. Pinning it is what keeps these runs
 * byte-identical between invocations (ARCHITECTURE §5).
 */
const EPOCH = 1_700_000_000_000;
const HOUR = 3_600_000;

/**
 * How long one fight takes a player at x1, in seconds — measured from the
 * choreographer's own timings rather than guessed, so the re-climb gate is in
 * real minutes. A raided floor is far cheaper: Quick-Raid resolves without
 * playing the animation (Q8).
 */
export const SECONDS_PER_FIGHT = 12;
export const SECONDS_PER_RAIDED_FLOOR = 0.4;

/** What a scripted player does with their gold and their bag between fights. */
export interface Archetype {
  id: string;
  /** Wears a better piece when one drops. Almost everyone does. */
  equipsDrops: boolean;
  /** Visits both merchants whenever the shelf is stale, and buys upgrades. */
  shops: boolean;
  /** Pours gold into gear levels whenever a level is affordable. */
  upgradesGear: boolean;
  /** Buys stat points with whatever is left. */
  buysStats: boolean;
  /** Sells what the bag cannot hold rather than refusing drops. */
  sellsSpares: boolean;
}

export const ARCHETYPES: Readonly<Record<string, Archetype>> = {
  /** The floor on how bad it can get: climbs, wears drops, never spends. */
  climberNoShop: {
    id: 'ClimberNoShop',
    equipsDrops: true,
    shops: false,
    upgradesGear: false,
    buysStats: false,
    sellsSpares: true,
  },
  /** The intended player: shops on every restock, upgrades, buys stats. */
  shopEveryRestock: {
    id: 'ShopEveryRestock',
    equipsDrops: true,
    shops: true,
    upgradesGear: true,
    buysStats: true,
    sellsSpares: true,
  },
  /** Saves for the gacha: never upgrades gear, banks gold, wears what drops. */
  gachaHoarder: {
    id: 'GachaHoarder',
    equipsDrops: true,
    shops: false,
    upgradesGear: false,
    buysStats: true,
    sellsSpares: true,
  },
};

export interface SessionReport {
  session: number;
  /** Deepest floor the hero has ever cleared by the end of this session. */
  bestFloor: number;
  /** Fights actually resolved, and how many of those were raided. */
  fights: number;
  raided: number;
  /** Real seconds this session would have taken at x1 Battle Speed. */
  seconds: number;
  /** Seconds spent getting back to the previous best — the §2 re-climb target. */
  reclimbSeconds: number;
  deaths: number;
  goldEarned: number;
  goldSpent: number;
  goldHeld: number;
  ticketsEarned: number;
  luckyTicketsEarned: number;
  /** Best rarity seen in a drop so far, as a ladder index. */
  bestRarity: number;
  /** Gear levels across worn equipment at the end of the session. */
  gearLevels: number[];
  /** Cheapest thing the player could buy right now — §1's "always something". */
  cheapestSink: number;
  /** Everything they would buy if gold were free — §14's "always short". */
  wantedSink: number;
  level: number;
  power: number;
}

export interface SimReport {
  classId: ClassId;
  archetype: string;
  sessions: SessionReport[];
  /** Floor the hero first died on — the early-game wall (BALANCE.md §10). */
  firstDeathFloor: number;
  bestFloor: number;
  totalFights: number;
  /** Fights that ended on the round cap rather than a death (COMBAT.md §3). */
  roundCapFires: number;
  /** Rounds in which the hero spent a signature, over rounds fought. */
  signatureUptime: number;
  finalLevel: number;
  finalPower: number;
  /** First floor on which a Legendary or better dropped. Infinity if never. */
  firstLegendaryFloor: number;
  firstMythicFloor: number;
}

export interface SimOptions {
  classId: ClassId;
  archetype: Archetype;
  /** Play sessions, each one a sitting at the tower. */
  sessions: number;
  /** Fights per session before the player stops for the day. */
  fightsPerSession?: number;
  /** Give up past this floor, so a broken curve cannot hang the sim. */
  floorCap?: number;
  seed?: string;
}

interface Wallet {
  earned: number;
  spent: number;
}

/** Simulate one archetype's play, session after session, and report what happened. */
export function simulate(options: SimOptions): SimReport {
  const {
    classId,
    archetype,
    sessions,
    fightsPerSession = 60,
    floorCap = 2_000,
    seed = 'sim',
  } = options;

  let character = createCharacter({
    slotId: 1,
    name: 'Simulacrum',
    classId,
    createdAt: EPOCH,
    runSeed: createRng(`${seed}:${classId}:${archetype.id}`).next().toString(36),
  });

  const reports: SessionReport[] = [];
  const wallet: Wallet = { earned: 0, spent: 0 };
  let now = EPOCH;
  let totalFights = 0;
  let roundCapFires = 0;
  let signatureRounds = 0;
  let roundsFought = 0;
  let firstDeathFloor = 0;
  let bestRarity = 0;
  let firstLegendaryFloor = Infinity;
  let firstMythicFloor = Infinity;

  for (let session = 1; session <= sessions; session += 1) {
    // A session is a sitting: a few hours of real time have passed since the
    // last one, which is what ages the shelves out (Q17).
    now += 6 * HOUR;

    const openingBest = character.tower.highestFloorEverCleared;
    const openingGold = character.currencies.gold;
    const openingSpend = wallet.spent;
    let fights = 0;
    let raided = 0;
    let deaths = 0;
    let seconds = 0;
    let reclimbSeconds = 0;
    const ticketsBefore = character.currencies.tickets;
    const luckyBefore = character.currencies.luckyTickets;

    while (fights < fightsPerSession) {
      // Re-climb what is already beaten before pushing into the unknown (§3.4).
      if (character.tower.currentRunFloor <= character.tower.highestFloorEverCleared) {
        const target = character.tower.highestFloorEverCleared;
        const raid = quickRaid(character, target, now);
        character = raid.character;
        fights += raid.floors.length;
        raided += raid.floors.length;
        const raidSeconds = raid.floors.length * SECONDS_PER_RAIDED_FLOOR;
        seconds += raidSeconds;
        reclimbSeconds += raidSeconds;
        for (const raided of raid.floors) observe(raided.script);
        totalFights += raid.floors.length;

        if (raid.died) {
          deaths += 1;
          character = applyDeath(character);
          // A player who just died goes and spends before climbing again —
          // that is the whole point of dying with gold in your pocket (§3.3).
          character = spendBetweenFights(character, archetype, wallet, now);
          continue;
        }
      }

      const floor = character.tower.currentRunFloor;
      if (floor > floorCap) break;

      const result = fightFloor(character, floor, now);
      character = result.character;
      fights += 1;
      totalFights += 1;
      seconds += SECONDS_PER_FIGHT;
      observe(result.script);

      if (!result.cleared) {
        if (firstDeathFloor === 0) firstDeathFloor = floor;
        deaths += 1;
        character = applyDeath(character);
        character = spendBetweenFights(character, archetype, wallet, now);
        continue;
      }

      for (const item of result.reward?.items ?? []) {
        const index = rarityIndex(item.rarity);
        bestRarity = Math.max(bestRarity, index);
        if (index >= rarityIndex('legendary')) {
          firstLegendaryFloor = Math.min(firstLegendaryFloor, floor);
        }
        if (index >= rarityIndex('mythic')) {
          firstMythicFloor = Math.min(firstMythicFloor, floor);
        }
      }

      character = spendBetweenFights(character, archetype, wallet, now);
    }

    // Earned is derived rather than accumulated at every faucet: whatever the
    // purse gained, plus whatever left it, is exactly what came in.
    const spent = wallet.spent - openingSpend;
    const earned = character.currencies.gold - openingGold + spent;
    wallet.earned += earned;

    reports.push({
      session,
      bestFloor: character.tower.highestFloorEverCleared,
      fights,
      raided,
      seconds,
      // Only counts when there was something to re-climb: session one has no wall.
      reclimbSeconds: openingBest > 0 ? reclimbSeconds : 0,
      deaths,
      goldEarned: earned,
      goldSpent: spent,
      goldHeld: character.currencies.gold,
      ticketsEarned: character.currencies.tickets - ticketsBefore,
      luckyTicketsEarned: character.currencies.luckyTickets - luckyBefore,
      bestRarity,
      gearLevels: equippedItems(character).map((item) => item.level),
      cheapestSink: cheapestSink(character),
      wantedSink: wantedSink(character),
      level: character.progression.level,
      power: powerOf(character),
    });
  }

  return {
    classId,
    archetype: archetype.id,
    sessions: reports,
    firstDeathFloor,
    bestFloor: character.tower.highestFloorEverCleared,
    totalFights,
    roundCapFires,
    signatureUptime: roundsFought > 0 ? signatureRounds / roundsFought : 0,
    finalLevel: character.progression.level,
    finalPower: powerOf(character),
    firstLegendaryFloor,
    firstMythicFloor,
  };

  function observe(script: CombatScript): void {
    if (script.outcome.byRoundCap) roundCapFires += 1;
    roundsFought += script.outcome.rounds;
    for (const event of script.events) {
      if (event.type === 'action' && event.unit === 'hero' && event.kind === 'signature') {
        signatureRounds += 1;
      }
    }
  }
}

/**
 * The cheapest thing gold can buy right now.
 *
 * Brief §1's promise — "the player always has a next thing to claim, upgrade or
 * push" — is only true if this is reachable. A purse that cannot buy the
 * cheapest sink in the game is a player with nothing to do.
 */
export function cheapestSink(character: Character): number {
  const costs: number[] = [];
  for (const item of equippedItems(character)) {
    if (canLevelUp(item)) costs.push(gearLevelCost(item));
  }
  for (const stat of UPGRADABLE_STAT_IDS) {
    costs.push(statUpgradeCost(stat, character.purchasedStats[stat]));
  }
  return costs.length > 0 ? Math.min(...costs) : Infinity;
}

/**
 * Everything the player would buy if gold were free: every worn piece to level
 * 15, and the next stat point in every stat.
 *
 * §14's rule is that this must always exceed the purse. A game where the wanted
 * pile is affordable is a game that has stopped asking anything of the player.
 */
export function wantedSink(character: Character): number {
  let total = 0;
  for (const item of equippedItems(character)) total += gearLevelCostToMax(item);
  for (const stat of UPGRADABLE_STAT_IDS) {
    total += statUpgradeCost(stat, character.purchasedStats[stat]);
  }
  return total;
}

/**
 * The simulator climbs without companions on purpose: the balance gates measure
 * the tower against a hero alone, which is the floor every other configuration
 * sits above (Q42).
 */
function powerOf(character: Character): number {
  return powerLevel(powerInputsFor(character, null));
}

/** Everything a scripted player does between fights, in the order they'd do it. */
function spendBetweenFights(
  character: Character,
  archetype: Archetype,
  wallet: Wallet,
  now: number,
): Character {
  let current = character;
  if (archetype.equipsDrops) current = wearBetterDrops(current);
  if (archetype.sellsSpares) current = sellSpares(current, wallet);
  if (archetype.shops) current = shop(current, wallet, now);
  if (archetype.upgradesGear) current = upgradeWornGear(current, wallet);
  if (archetype.buysStats) current = buyStats(current, wallet);
  return current;
}

/**
 * Wear a dropped item when it is both usable and better than what is worn.
 * "Better" is budget-based, which matches how the game values gear itself.
 */
function wearBetterDrops(character: Character): Character {
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

    // The piece that comes off goes back in the bag, exactly as `equipFromInventory`
    // does it — a simulator that quietly deleted the old item would understate
    // both bag pressure and sale income.
    current = {
      ...current,
      equipment: { ...current.equipment, [def.slot]: item },
      inventory: [
        ...current.inventory.filter((held) => held.uid !== item.uid),
        ...(worn ? [worn] : []),
      ],
    };
  }

  return current;
}

/** Keep the bag from filling up, which is what a real player does (Q16). */
function sellSpares(character: Character, wallet: Wallet): Character {
  if (character.inventory.length < STARTING_BACKPACK_SLOTS - 4) return character;
  const keep = character.inventory.slice(-4);
  const sold = character.inventory.slice(0, -4);
  const gold = sold.reduce((total, item) => total + sellValue(item), 0);
  wallet.earned += gold;
  return {
    ...character,
    inventory: keep,
    currencies: { ...character.currencies, gold: character.currencies.gold + gold },
  };
}

/** Visit both shelves, restock what is stale, and buy anything better and affordable. */
function shop(character: Character, wallet: Wallet, now: number): Character {
  let current = character;
  const bracket = bracketForCharacter(current);
  const context = {
    now,
    bracketIndex: bracket.index,
    highestFloor: current.tower.highestFloorEverCleared,
  };

  for (const id of MERCHANT_IDS) {
    const state = needsRestock(current.merchants[id], context)
      ? restock(id, current.tower.runSeed, context)
      : current.merchants[id];
    current = { ...current, merchants: { ...current.merchants, [id]: state } };

    for (const entry of stockOf(id, current, state, bracket)) {
      if (entry.sold) continue;
      const price = buyPrice(entry.item);
      if (price > current.currencies.gold) continue;

      const worn = current.equipment[requireItemDef(entry.item.defId).slot];
      if (worn && worn.budget >= entry.item.budget) continue;

      wallet.spent += price;
      current = {
        ...current,
        currencies: { ...current.currencies, gold: current.currencies.gold - price },
        inventory: [...current.inventory, entry.item],
        merchants: {
          ...current.merchants,
          [id]: { ...state, sold: [...state.sold, entry.index] },
        },
      };
    }
  }

  return wearBetterDrops(current);
}

/** Pour gold into the cheapest affordable gear level, repeatedly. */
function upgradeWornGear(character: Character, wallet: Wallet): Character {
  let current = character;

  for (let pass = 0; pass < 40; pass += 1) {
    const candidates = Object.entries(current.equipment)
      .filter(([, item]) => item && canLevelUp(item))
      .map(([slot, item]) => ({ slot, item: item!, cost: gearLevelCost(item!) }))
      .filter((entry) => entry.cost <= current.currencies.gold)
      .sort((a, b) => a.cost - b.cost);

    const cheapest = candidates[0];
    if (!cheapest) break;

    wallet.spent += cheapest.cost;
    current = {
      ...current,
      currencies: { ...current.currencies, gold: current.currencies.gold - cheapest.cost },
      equipment: { ...current.equipment, [cheapest.slot]: levelUp(cheapest.item) },
    };
  }

  return current;
}

/** Spend what is left on stat points, spreading across the stats a class wants. */
function buyStats(character: Character, wallet: Wallet): Character {
  let current = character;

  for (const stat of statPriority(current.identity.classId)) {
    const affordable = affordableStatPoints(current.purchasedStats, stat, current.currencies.gold);
    if (affordable <= 0) continue;
    const result = buyStatPoints(current.purchasedStats, stat, current.currencies.gold, affordable);
    wallet.spent += result.goldSpent;
    current = {
      ...current,
      purchasedStats: result.purchased,
      currencies: { ...current.currencies, gold: current.currencies.gold - result.goldSpent },
    };
  }

  return current;
}

/** What each class buys first — a scripted player's approximation of taste. */
function statPriority(classId: ClassId): UpgradableStatId[] {
  const offense: UpgradableStatId[] = ['strength', 'hp', 'defense', 'luck', 'resource'];
  const sturdy: UpgradableStatId[] = ['hp', 'strength', 'defense', 'luck', 'resource'];
  return classId === 'warrior' || classId === 'bard' ? sturdy : offense;
}

/** Run every class through the same archetype, for a parity read (§8). */
export function simulateAllClasses(
  archetype: Archetype = ARCHETYPES.shopEveryRestock!,
  sessions = 4,
  seed = 'parity',
): SimReport[] {
  return CLASS_IDS.map((classId: ClassId) => simulate({ classId, archetype, sessions, seed }));
}

/**
 * Win rate for a class at a *fixed* Power Level, which is the only honest way to
 * compare classes: §8 asks for different paths at comparable power, not for
 * everyone to reach the same floor at the same time.
 */
export function winRateAtPower(
  classId: ClassId,
  floors: readonly number[],
  seed: string,
  samples = 8,
): number {
  let wins = 0;
  let fights = 0;
  for (const floor of floors) {
    for (let sample = 0; sample < samples; sample += 1) {
      const hero = heroAtDepth(classId, floor, `${seed}:${sample}`);
      if (fightFloor(hero, floor, EPOCH).cleared) wins += 1;
      fights += 1;
    }
  }
  return wins / fights;
}

/**
 * A hero built to the power a player would plausibly have on a given floor:
 * levelled and stat-bought against that depth, wearing their starting kit.
 * Crude on purpose — what matters is that every class gets the same treatment.
 */
export function heroAtDepth(classId: ClassId, floor: number, seed: string): Character {
  const base = createCharacter({
    slotId: 1,
    name: 'Yardstick',
    classId,
    createdAt: EPOCH,
    runSeed: `${seed}:${classId}:${floor}`,
  });

  const level = Math.max(1, Math.min(100, Math.round(floor * 0.9)));
  const points = Math.max(0, Math.round(floor * 1.1));
  const purchased = { ...base.purchasedStats };
  for (const stat of UPGRADABLE_STAT_IDS) {
    purchased[stat] = Math.round(points / UPGRADABLE_STAT_IDS.length);
  }

  return {
    ...base,
    progression: { ...base.progression, level },
    purchasedStats: purchased,
    tower: { ...base.tower, highestFloorEverCleared: Math.max(0, floor - 1) },
  };
}

/** The bracket a character sits in, for readings that need it. */
export function bracketIndexOf(character: Character): number {
  return bracketFor(powerOf(character)).index;
}

export type { Rarity };

/**
 * **The balance gates** (BALANCE.md §10, ROADMAP M9).
 *
 * Every target the brief and the balance doc state as a *feel* is an assertion
 * here, measured over the real engine. That is the whole point of M9: "gold is
 * the resource the player is always slightly short of" is a sentence until
 * something fails when it stops being true.
 *
 * These run on every content and balance change (CLAUDE.md's standing rule), so
 * a future tuning pass that quietly breaks the first-session curve fails in the
 * commit that broke it.
 *
 * The bands are deliberately wider than the tuned values. A gate that only
 * passes at the exact numbers committed today is a gate that forbids tuning; a
 * gate should catch a *change of shape*, not a change of digit.
 */
import { describe, expect, it } from 'vitest';
import { CLASS_IDS, type ClassId } from '@/domain/character/types.ts';
import { GEAR_LEVEL_COST } from '@/content/balance/items.ts';
import { evaluate } from '@/content/balance/curves.ts';
import { RARITY_WEIGHTS } from '@/content/balance/rewards.ts';
import { bandOf } from '@/domain/combat/bands.ts';
import { CRIT, SPEED } from '@/content/balance/combat.ts';
import {
  ARCHETYPES,
  SECONDS_PER_FIGHT,
  simulate,
  simulateAllClasses,
  winRateAtPower,
  type SimReport,
} from './simulate.ts';

/** Enough runs that a gate reads the design rather than one lucky seed. */
const SEEDS = 12;

function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
}

/** Where the tower first stopped a hero. Never dying is a wall past the session. */
function firstWall(report: SimReport): number {
  return report.firstDeathFloor === 0
    ? report.sessions.at(-1)!.bestFloor + 1
    : report.firstDeathFloor;
}

describe('the first wall (BALANCE.md §10)', () => {
  it('stops a no-shop climber somewhere in floors 15–25', () => {
    // §10's target verbatim. It is the single most important number in the
    // game's opening: too shallow and the tower feels unfair before the player
    // has learned anything, too deep and nothing has been at stake.
    const walls: number[] = [];
    for (const classId of CLASS_IDS) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        walls.push(
          firstWall(
            simulate({
              classId,
              archetype: ARCHETYPES.climberNoShop!,
              sessions: 1,
              fightsPerSession: 80,
              seed: `gate:wall:${seed}`,
            }),
          ),
        );
      }
    }

    const median = percentile(walls, 0.5);
    expect(median, `median first wall was floor ${median}`).toBeGreaterThanOrEqual(12);
    expect(median, `median first wall was floor ${median}`).toBeLessThanOrEqual(28);
    // And it must actually be a distribution, not one scripted gate: a game
    // where everybody dies on exactly the same floor has one fight in it.
    expect(new Set(walls).size, 'every hero died on the same floor').toBeGreaterThan(3);
  });

  it('lets a first sitting get somewhere worth coming back to', () => {
    // Brief §1: a session must produce visible progress. A first sitting that
    // ends on floor 6 has produced a bounce, not progress.
    const depths = CLASS_IDS.map(
      (classId: ClassId) =>
        simulate({
          classId,
          archetype: ARCHETYPES.climberNoShop!,
          sessions: 1,
          fightsPerSession: 80,
          seed: 'gate:first-session',
        }).sessions[0]!.bestFloor,
    );
    expect(percentile(depths, 0.5)).toBeGreaterThanOrEqual(15);
  });
});

describe('the re-climb (Brief §3.3, BALANCE.md §2)', () => {
  it('takes minutes, not the hours the first climb took', () => {
    // Death must be cheap to recover from. The measure is real seconds at x1
    // Battle Speed: a raided floor resolves without playing its animation (Q8),
    // which is exactly what makes this affordable.
    const report = simulate({
      classId: 'warrior',
      archetype: ARCHETYPES.shopEveryRestock!,
      sessions: 6,
      seed: 'gate:reclimb',
    });

    const reclimbs = report.sessions.map((session) => session.reclimbSeconds).filter((s) => s > 0);
    expect(reclimbs.length, 'no session ever had a wall to re-climb').toBeGreaterThan(0);

    const worst = Math.max(...reclimbs);
    expect(worst, `worst re-climb took ${Math.round(worst)}s`).toBeLessThan(10 * 60);
    // And it must be far cheaper than fighting those floors again by hand.
    const deepest = report.bestFloor;
    expect(worst).toBeLessThan(deepest * SECONDS_PER_FIGHT * 0.25);
  });
});

describe('class parity (Brief §8)', () => {
  it('keeps every class inside a win-rate band at matched depth', () => {
    // §8 asks for "genuine upsides and downsides" — different *paths* at
    // comparable *power*, not identical classes. Measured at matched depth
    // rather than by how deep each one climbs, because how deep you get is a
    // function of how long you played.
    const floors = [6, 9, 12, 15, 18, 21, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 92, 104];
    const rates = CLASS_IDS.map((classId: ClassId) => ({
      classId,
      rate: winRateAtPower(classId, floors, 'gate:parity'),
    }));

    const spread = Math.max(...rates.map((r) => r.rate)) - Math.min(...rates.map((r) => r.rate));
    const detail = rates.map((r) => `${r.classId} ${(r.rate * 100).toFixed(1)}%`).join(', ');
    expect(spread, `spread ${(spread * 100).toFixed(1)} points — ${detail}`).toBeLessThan(0.15);

    // Nobody may be a trap pick, and nobody may trivialise the tower.
    for (const { classId, rate } of rates) {
      expect(rate, `${classId} wins ${(rate * 100).toFixed(1)}%`).toBeGreaterThan(0.25);
      expect(rate, `${classId} wins ${(rate * 100).toFixed(1)}%`).toBeLessThan(0.75);
    }
  });

  it('gives every class a signature it can actually reach', () => {
    // A class whose resource never fills has a signature in the tooltip and not
    // in the fight. The Swashbuckler was exactly that before M9: both of its
    // fill events depend on Speed, which comes only from gear (Brief §6).
    for (const report of simulateAllClasses(ARCHETYPES.shopEveryRestock!, 4, 'gate:sig')) {
      expect(
        report.signatureUptime,
        `${report.classId} spends a signature in ${(report.signatureUptime * 100).toFixed(1)}% of rounds`,
      ).toBeGreaterThan(0.02);
      expect(report.signatureUptime, report.classId).toBeLessThan(0.5);
    }
  });
});

describe('gold (Brief §14)', () => {
  it('leaves every archetype able to buy something, always', () => {
    // Brief §1: the player always has a next thing to claim or upgrade. If the
    // cheapest sink in the game is out of reach, the session is dead time.
    for (const archetype of Object.values(ARCHETYPES)) {
      const report = simulate({
        classId: 'hunter',
        archetype,
        sessions: 6,
        seed: `gate:gold:${archetype.id}`,
      });
      const stuck = report.sessions.filter((session) => session.goldEarned < session.cheapestSink);
      expect(
        stuck.length,
        `${archetype.id} had ${stuck.length} sessions that could not afford anything`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('never lets a purse cover everything the player wants (§14)', () => {
    // The rule that makes gold matter: sinks outpace faucets at every stage.
    // Measured against what the player would buy *if gold were free*, not
    // against one item — a game where you can finish your shopping list is a
    // game where gold has stopped being a decision.
    for (const archetype of Object.values(ARCHETYPES)) {
      const report = simulate({
        classId: 'warrior',
        archetype,
        sessions: 6,
        seed: `gate:short:${archetype.id}`,
      });
      for (const session of report.sessions) {
        expect(
          session.goldHeld,
          `${archetype.id} session ${session.session}: held ${session.goldHeld}, wanted ${session.wantedSink}`,
        ).toBeLessThan(session.wantedSink);
      }
    }
  });
});

describe('gear upgrades (Brief §10.1)', () => {
  it('makes levels 1–10 free-flowing and 11–15 a proud push', () => {
    // The costs are multiples of the item's own worth, so this reads the shape
    // directly rather than through any particular item.
    const step = (level: number): number => {
      const { early, late, lateStartsAt } = GEAR_LEVEL_COST;
      return level <= lateStartsAt
        ? evaluate({ kind: 'polynomial', ...early }, level)
        : late.offsetCost * Math.pow(late.factor, (level - late.offsetLevel) / late.period);
    };

    const early = Array.from({ length: 10 }, (_, index) => step(index + 1)).reduce((a, b) => a + b);
    const late = Array.from({ length: 5 }, (_, index) => step(index + 11)).reduce((a, b) => a + b);

    // Free-flowing: the whole first ten levels cost less than ten times what the
    // piece is worth — an evening's income across a set, not a project.
    expect(early, `levels 1–10 cost ${early.toFixed(1)}× the item`).toBeLessThan(10);
    // A proud push: the last five cost several times the first ten…
    expect(late / early, `11–15 is ${(late / early).toFixed(1)}× the cost of 1–10`).toBeGreaterThan(
      4,
    );
    // …but never so much that it reads as a toll gate rather than a goal.
    expect(late / early).toBeLessThan(20);
    // And every step is dearer than the one before it.
    for (let level = 2; level <= 15; level += 1)
      expect(step(level)).toBeGreaterThan(step(level - 1));
  });
});

describe('the rarity arc (Brief §9.2)', () => {
  it('caps the early game at Epic and holds Mythical back for years', () => {
    const early = RARITY_WEIGHTS[0]!.weights;
    expect(early['legendary'], 'a Legendary can drop in the first bracket').toBe(0);
    expect(early['epic']!).toBeGreaterThan(0);

    // Mythical is "insanely rare" at every depth — never a schedule, always an
    // event. Under a tenth of a percent even at the deepest authored table.
    for (const table of RARITY_WEIGHTS) {
      const total = Object.values(table.weights).reduce((a, b) => a + b, 0);
      const mythic = table.weights['mythic']! / total;
      expect(
        mythic,
        `bracket ${table.fromBracket}+ drops Mythical at ${(mythic * 100).toFixed(3)}%`,
      ).toBeLessThan(0.001);
    }

    // And the arc actually rises: deeper tables are richer than shallow ones.
    const share = (index: number): number => {
      const weights = RARITY_WEIGHTS[index]!.weights;
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      return (weights['epic']! + weights['legendary']!) / total;
    };
    for (let index = 1; index < RARITY_WEIGHTS.length; index += 1) {
      expect(share(index)).toBeGreaterThan(share(index - 1));
    }
  });

  it('does not hand a Legendary to a first-session hero', () => {
    const report = simulate({
      classId: 'mage',
      archetype: ARCHETYPES.climberNoShop!,
      sessions: 1,
      fightsPerSession: 80,
      seed: 'gate:rarity',
    });
    expect(report.firstLegendaryFloor).toBeGreaterThan(40);
  });
});

describe('tickets (Brief §16.1, BALANCE.md §8)', () => {
  it('keeps a pull an event rather than a routine', () => {
    // §8's target: a Ticket every day-or-two of normal play, Lucky Tickets about
    // weekly. A session here is one sitting; a day is one or two of them.
    const report = simulate({
      classId: 'hunter',
      archetype: ARCHETYPES.shopEveryRestock!,
      sessions: 8,
      seed: 'gate:tickets',
    });
    const perSession =
      report.sessions.reduce((total, s) => total + s.ticketsEarned, 0) / report.sessions.length;
    const luckyPerSession =
      report.sessions.reduce((total, s) => total + s.luckyTicketsEarned, 0) /
      report.sessions.length;

    expect(perSession, `${perSession.toFixed(2)} tickets per sitting`).toBeGreaterThan(0.25);
    expect(perSession, `${perSession.toFixed(2)} tickets per sitting`).toBeLessThan(6);
    expect(luckyPerSession, `${luckyPerSession.toFixed(2)} lucky per sitting`).toBeLessThan(1.5);
  });
});

describe('the endless guard (COMBAT.md §3)', () => {
  it('effectively never fires', () => {
    // The round cap exists so a mutually-unkillable pair cannot hang the game.
    // If it is firing, two units cannot hurt each other and the tuning is wrong.
    let capped = 0;
    let fights = 0;
    for (const archetype of Object.values(ARCHETYPES)) {
      for (const classId of CLASS_IDS) {
        const report = simulate({
          classId,
          archetype,
          sessions: 3,
          seed: `gate:cap:${archetype.id}`,
        });
        capped += report.roundCapFires;
        fights += report.totalFights;
      }
    }
    expect(fights).toBeGreaterThan(2_000);
    expect(capped / fights, `${capped} of ${fights} fights hit the round cap`).toBeLessThan(0.005);
  });
});

describe('band-relative percentages (Brief §3.7)', () => {
  it('keeps crit and double-attack inside their windows at every depth', () => {
    // The references must grow at the same rate stats do, or every percentage in
    // the game pins at its cap a few hundred floors in. This is the arithmetic
    // check that says so, independent of any simulated run.
    for (const floor of [1, 10, 50, 100, 500, 1_000, 5_000]) {
      const band = bandOf(floor);
      expect(Number.isFinite(band.defenseK), `floor ${floor}`).toBe(true);
      // A stat that scales with the tower should sit near its reference at every
      // depth, so the ratio between them stays put rather than drifting.
      const critRatio = band.critReference / band.defenseK;
      const speedRatio = band.speedReference / band.defenseK;
      expect(critRatio).toBeCloseTo(CRIT.reference.base / 60, 6);
      expect(speedRatio).toBeCloseTo(SPEED.reference.base / 60, 6);
    }
  });
});

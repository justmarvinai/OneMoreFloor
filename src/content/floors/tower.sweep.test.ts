/**
 * **The tower sweep** — ROADMAP M8's exit criterion, as an executable check.
 *
 * "Floors 1–5000 generate sane (automated sweep: stats monotone, no missing
 * refs); every enemy renders (silhouette fallback confirmed working per §4.3)."
 *
 * Content validation elsewhere checks each definition in isolation. This checks
 * the thing the player actually meets: five thousand generated floors, each one
 * built from the real generator with real content, asserted to be a fight rather
 * than a crash, an empty pool, or a number that stopped rising.
 *
 * It is deliberately in `content/` rather than `domain/`: nothing here tests the
 * generator's logic, it tests whether the *content* the generator was given
 * covers the tower. A dangling avatar or a band whose families nobody belongs to
 * fails here, which is where a content author would look.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { en } from '@/strings/en.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import { generateFloor } from '@/domain/tower/floors.ts';
import { BOSSES, ENEMIES } from '@/content/enemies/index.ts';
import { FLOOR_BANDS, bandForFloor, isBossFloor } from './index.ts';

/** How deep the sweep goes. The brief's tower is endless; this is far enough. */
const DEEPEST = 5_000;

/** Every art id the game can render, read from the CSS that declares them. */
const ART_IDS = new Set(
  ['src/ui/fui/styles/assets.css', 'src/styles/art.css'].flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/--fui-img-([a-z0-9-]+)\s*:/g)].map(
      (match) => match[1]!,
    ),
  ),
);

const SEED = 'sweep:run:1';

describe('the tower sweep (ROADMAP M8)', () => {
  it('generates every floor from 1 to 5000 without a gap', () => {
    for (let floor = 1; floor <= DEEPEST; floor += 1) {
      const generated = generateFloor(SEED, floor);
      expect(generated.enemy, `floor ${floor}: no enemy`).toBeDefined();
      expect(generated.band, `floor ${floor}: no band`).toBeDefined();
      expect(generated.isBoss, `floor ${floor}`).toBe(isBossFloor(floor));
    }
  });

  it('never dangles a reference the player would see as an empty frame', () => {
    for (let floor = 1; floor <= DEEPEST; floor += 1) {
      const { enemy, band, effects } = generateFloor(SEED, floor);

      expect(ART_IDS, `floor ${floor}: no artwork for "${enemy.avatar}"`).toContain(enemy.avatar);
      expect(ART_IDS, `floor ${floor}: no backdrop "${band.backdrop}"`).toContain(band.backdrop);
      expect(en[enemy.nameKey], `floor ${floor}: unnamed ${enemy.id}`).toBeTypeOf('string');
      for (const { effect } of effects) {
        expect(
          en[effect.nameKey as keyof typeof en],
          `floor ${floor}: unnamed effect ${effect.id}`,
        ).toBeTypeOf('string');
      }
    }
  });

  it('keeps every stat a positive finite number, however deep', () => {
    // The failure this guards against is not a wrong number, it is `Infinity`
    // and `NaN`: an exponential over 5000 floors overflows quietly, and a fight
    // against a `NaN` enemy neither crashes nor ends (Brief §3.7).
    for (const floor of everyTenth()) {
      const { stats } = generateFloor(SEED, floor);
      for (const stat of STAT_IDS) {
        expect(Number.isFinite(stats[stat]), `floor ${floor}: ${stat} is ${stats[stat]}`).toBe(
          true,
        );
        expect(stats[stat], `floor ${floor}: ${stat}`).toBeGreaterThan(0);
      }
    }
  });

  it('rises monotonically with depth — deeper is always harder', () => {
    // Compared decade to decade rather than floor to floor: a single floor can
    // dip when a fast, fragile enemy follows a hulking one, and it should be
    // able to. What must never happen is floor 500 being an easier fight than
    // floor 400.
    let previous = 0;
    for (let floor = 10; floor <= DEEPEST; floor += 10) {
      const total = decadeWeight(floor);
      expect(total, `floor ${floor} is weaker than floor ${floor - 10}`).toBeGreaterThan(previous);
      previous = total;
    }
  });

  it('gives a boss every tenth floor, and stops repeating one past the authored range', () => {
    const deepGates = new Set<string>();
    for (let floor = 10; floor <= DEEPEST; floor += 10) {
      const { enemy, isBoss } = generateFloor(SEED, floor);
      expect(isBoss, `floor ${floor}`).toBe(true);
      expect(
        BOSSES.map((boss) => boss.id),
        `floor ${floor}`,
      ).toContain(enemy.id);
      if (floor > 100) deepGates.add(enemy.id);
    }
    // Past floor 100 the roster cycles, so the deep tower is not one boss on a
    // loop for four thousand floors.
    expect(deepGates.size).toBe(BOSSES.length);
  });

  it('puts every authored enemy somewhere a player can actually meet it', () => {
    // An enemy is gated twice — by its own floor range and by its family's
    // bands. It is entirely possible to author one that satisfies neither at the
    // same time, and it would simply never appear.
    const met = new Set<string>();
    for (let floor = 1; floor <= 1_200; floor += 1) {
      if (isBossFloor(floor)) continue;
      // Several seeds per floor, because one draw does not exhaust a pool.
      for (let seed = 0; seed < 6; seed += 1) {
        met.add(generateFloor(`sweep:${seed}`, floor).enemy.id);
      }
    }
    for (const enemy of ENEMIES) {
      expect(
        met,
        `${enemy.id} is unreachable: no floor in its range is in a band of its family`,
      ).toContain(enemy.id);
    }
  });

  it('draws only from the families a band says live there', () => {
    for (let floor = 1; floor <= 400; floor += 1) {
      if (isBossFloor(floor)) continue;
      const band = bandForFloor(floor);
      for (let seed = 0; seed < 4; seed += 1) {
        const { enemy } = generateFloor(`family:${seed}`, floor);
        expect(
          band.families,
          `floor ${floor} (${band.id}) served a ${enemy.family}: ${enemy.id}`,
        ).toContain(enemy.family);
      }
    }
  });

  it('offers real variety on every floor of the authored range', () => {
    // Three or more distinct enemies on a floor is what keeps a climb from
    // reading as the same fight ten times (Q12: ~3 per band).
    for (let floor = 1; floor <= 100; floor += 1) {
      if (isBossFloor(floor)) continue;
      const band = bandForFloor(floor);
      const pool = ENEMIES.filter(
        (enemy) =>
          floor >= enemy.floors[0] &&
          floor <= enemy.floors[1] &&
          band.families.includes(enemy.family),
      );
      expect(
        pool.length,
        `floor ${floor} (${band.id}) has only ${pool.length} enemies`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('never serves the same enemy two floors running', () => {
    // The pacing rule, asserted rather than hoped for. Independent draws produce
    // runs — the first pacing pass over this roster turned up four Cave Lurkers
    // in a row — and a repeated floor is the loudest way an endless tower reads
    // as unfinished (§3.7).
    for (const seed of ['pace:1', 'pace:2', 'pace:3']) {
      let previous = '';
      for (let floor = 1; floor <= 600; floor += 1) {
        const { enemy } = generateFloor(seed, floor);
        if (!isBossFloor(floor) && !isBossFloor(floor - 1)) {
          expect(
            enemy.id,
            `${seed}: floors ${floor - 1} and ${floor} are both ${enemy.id}`,
          ).not.toBe(previous);
        }
        previous = enemy.id;
      }
    }
  });

  it('shows at least four different enemies in any ten authored floors', () => {
    // The first session is the one that has to hold up (ROADMAP M8), and it is
    // measured over what a *single run* actually meets, not over the pool.
    for (let start = 1; start <= 91; start += 10) {
      const met = new Set<string>();
      for (let floor = start; floor < start + 10; floor += 1) {
        if (!isBossFloor(floor)) met.add(generateFloor('first-session', floor).enemy.id);
      }
      expect(
        met.size,
        `floors ${start}–${start + 9} showed only ${met.size} enemies`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('confirms the silhouette fallback still works (Brief §4.3)', () => {
    // §4.3's fallback is only a fallback if it resolves. An enemy wearing it
    // must render exactly like one wearing bespoke art.
    const fallback = ENEMIES.filter((enemy) => enemy.avatar.startsWith('silhouette-'));
    expect(fallback.length, 'nothing exercises the fallback any more').toBeGreaterThan(0);
    for (const enemy of fallback) {
      expect(ART_IDS, `${enemy.id}: the fallback itself is missing`).toContain(enemy.avatar);
    }
  });

  it('gives every band a cast, and every family a home', () => {
    const authored = new Set(ENEMIES.map((enemy) => enemy.family));
    const housed = new Set(FLOOR_BANDS.flatMap((band) => band.families));
    for (const family of authored) {
      expect(housed, `no band contains the ${family} family`).toContain(family);
    }
    for (const band of FLOOR_BANDS) {
      for (const family of band.families) {
        expect(authored, `${band.id} names ${family}, which has no enemies`).toContain(family);
      }
    }
  });
});

/** Every tenth floor plus the extremes — enough coverage without 5000 asserts. */
function everyTenth(): number[] {
  const floors = [1, 2, 3];
  for (let floor = 10; floor <= DEEPEST; floor += 10) floors.push(floor);
  return floors;
}

/**
 * One number for how dangerous a floor's decade is, averaged over its enemies so
 * a single unlucky roll cannot make a decade look weaker than the one before.
 */
function decadeWeight(floor: number): number {
  let total = 0;
  for (let seed = 0; seed < 8; seed += 1) {
    const { stats } = generateFloor(`weight:${seed}`, floor);
    total += stats.strength + stats.defense + stats.hp;
  }
  return total / 8;
}

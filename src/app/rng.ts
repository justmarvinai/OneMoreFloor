/**
 * Seeded random number generation.
 *
 * Every random decision in the game draws from a *named* stream so outcomes are
 * reproducible: a fight resolved from the same seed produces the same script and
 * the same loot whether it was watched, skipped or replayed from a bug report
 * (ARCHITECTURE §5, COMBAT.md §1). `Math.random()` is banned everywhere else by
 * lint; this module is the only place it would even be meaningful.
 *
 *   const rng = createRng('combat:run7:floor12');
 *   const damage = rng.range(90, 110);
 *
 * Streams derive children by *label*, not by consumption order:
 *
 *   rng.fork('loot')   // always the same stream for this parent + label,
 *                      // however many numbers the parent drew first.
 *
 * That property is what keeps replays stable when game code changes shape.
 */

/** A deterministic random stream. */
export interface Rng {
  /** The full name of this stream, including any forked labels. */
  readonly seed: string;
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability `p` (clamped to [0, 1]). */
  chance(p: number): boolean;
  /** Uniform pick. Throws on an empty list rather than returning undefined. */
  pick<T>(items: readonly T[]): T;
  /** Weighted pick. Entries with weight <= 0 can never be chosen. */
  weighted<T>(entries: readonly WeightedEntry<T>[]): T;
  /** A child stream derived from this one's seed and `label`. */
  fork(label: string): Rng;
}

export interface WeightedEntry<T> {
  readonly value: T;
  readonly weight: number;
}

/**
 * A fresh, unpredictable seed — for a new character's tower run, where the point
 * is that two players do not get the same tower. Every *use* of the seed after
 * this is deterministic; only its creation draws real entropy.
 */
export function newSeed(prefix = 'run'): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}:${hex}`;
}

/** FNV-1a, 32-bit. Small, fast and well spread for short string seeds. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // A zero state would make mulberry32 degenerate, so nudge it off zero.
  return hash >>> 0 || 0x9e3779b9;
}

/** mulberry32: 32-bit state, passes the usual smoke tests, trivial to port. */
function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a named deterministic stream. The same seed always replays identically. */
export function createRng(seed: string): Rng {
  const next = mulberry32(hashSeed(seed));

  const rng: Rng = {
    seed,
    next,

    int(min, max) {
      if (max < min) throw new RangeError(`rng.int: max (${max}) is below min (${min})`);
      return min + Math.floor(next() * (max - min + 1));
    },

    range(min, max) {
      if (max < min) throw new RangeError(`rng.range: max (${max}) is below min (${min})`);
      return min + next() * (max - min);
    },

    chance(p) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },

    pick(items) {
      if (items.length === 0) throw new RangeError('rng.pick: cannot pick from an empty list');
      const item = items[Math.floor(next() * items.length)];
      // The index is always in range, so this only fires if the list holds a
      // hole or an explicit undefined — worth failing loudly over either way.
      if (item === undefined)
        throw new RangeError('rng.pick: list contains no value at that index');
      return item;
    },

    weighted(entries) {
      const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
      if (total <= 0) {
        throw new RangeError('rng.weighted: total weight must be greater than zero');
      }
      let roll = next() * total;
      for (const entry of entries) {
        const weight = Math.max(0, entry.weight);
        if (weight === 0) continue;
        roll -= weight;
        if (roll < 0) return entry.value;
      }
      // Floating-point drift can leave `roll` marginally above zero on the last
      // entry; fall back to the final eligible one rather than returning undefined.
      const last = entries.filter((entry) => entry.weight > 0).at(-1);
      if (last === undefined) throw new RangeError('rng.weighted: no entry with positive weight');
      return last.value;
    },

    fork(label) {
      return createRng(`${seed}/${label}`);
    },
  };

  return rng;
}

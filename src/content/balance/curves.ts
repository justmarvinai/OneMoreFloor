/**
 * Shared curve shapes (BALANCE.md §3).
 *
 * Every scaling number in the game is one of a handful of shapes with named
 * parameters, rather than an ad-hoc formula per system. That is what makes the
 * game tunable by a human six months from now: you change a parameter whose
 * meaning is written down, not an expression whose behaviour you have to
 * re-derive.
 *
 * All curves take `x` from 0 upwards and are pure.
 */

export interface ExponentialCurve {
  kind: 'exponential';
  /** Value at x = 0. */
  base: number;
  /** Multiplier applied every `period` steps. */
  factor: number;
  period: number;
}

export interface PolynomialCurve {
  kind: 'polynomial';
  base: number;
  coefficient: number;
  exponent: number;
}

export interface PiecewiseCurve {
  kind: 'piecewise';
  /** Segments in ascending order of `until`; the last one runs forever. */
  segments: Array<{ until: number; curve: Curve }>;
}

export type Curve = ExponentialCurve | PolynomialCurve | PiecewiseCurve;

export function evaluate(curve: Curve, x: number): number {
  switch (curve.kind) {
    case 'exponential':
      return curve.base * Math.pow(curve.factor, x / curve.period);
    case 'polynomial':
      return curve.base + curve.coefficient * Math.pow(x, curve.exponent);
    case 'piecewise': {
      for (const segment of curve.segments) {
        if (x <= segment.until) return evaluate(segment.curve, x);
      }
      const last = curve.segments.at(-1);
      if (!last) throw new Error('piecewise curve has no segments');
      return evaluate(last.curve, x);
    }
  }
}

/**
 * Diminishing-returns factor: `k / (k + value)`, the shape used wherever a stat
 * must keep mattering forever without ever reaching immunity or certainty
 * (COMBAT.md §2, BALANCE.md §4). Returns 1 at value 0, approaching 0 as value
 * grows, never reaching it.
 */
export function diminishing(value: number, k: number): number {
  if (k <= 0) throw new RangeError('diminishing: k must be positive');
  return k / (k + Math.max(0, value));
}

/**
 * A band-relative percentage: how a raw stat converts into a chance that stays in
 * a tuned window however far stats inflate. `reference` is the stat value that
 * yields half the cap at this depth.
 */
export function bandRelative(value: number, reference: number, cap: number): number {
  if (reference <= 0) throw new RangeError('bandRelative: reference must be positive');
  const raw = Math.max(0, value);
  return cap * (raw / (raw + reference));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation, with `t` clamped to [0, 1]. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1);
}

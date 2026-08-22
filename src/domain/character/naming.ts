/**
 * Hero name rules (Q25).
 *
 * Naming the hero replaces account creation entirely (Brief §5), which makes the
 * name the one piece of identity the player chooses — and, since there is no
 * rename in 0.1, one they live with. The rules are deliberately permissive about
 * *what* a name says and strict about the shapes that would break a UI or make
 * two slots indistinguishable.
 */

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 16;

/** Letters (any script), digits, spaces, apostrophes and hyphens. */
const ALLOWED = /^[\p{L}\p{N} '-]+$/u;
const HAS_LETTER = /\p{L}/u;

export type NameProblem =
  'empty' | 'tooShort' | 'tooLong' | 'illegalCharacters' | 'noLetter' | 'duplicate';

export interface NameCheck {
  ok: boolean;
  problem?: NameProblem;
}

/**
 * Collapse runs of whitespace and trim. Applied before validating *and* before
 * storing, so "  Sir   Gawain  " and "Sir Gawain" are the same name rather than
 * two that merely look alike.
 */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Case- and space-insensitive key used for the uniqueness check. */
export function nameKey(raw: string): string {
  return normalizeName(raw).toLocaleLowerCase();
}

/**
 * Validate a proposed hero name. `taken` is the set of names already used by
 * *this player's own* characters — uniqueness is per account, since there is no
 * server and nobody else's names exist (Brief §21).
 */
export function checkName(raw: string, taken: readonly string[] = []): NameCheck {
  const name = normalizeName(raw);

  if (name.length === 0) return { ok: false, problem: 'empty' };
  if (name.length < NAME_MIN_LENGTH) return { ok: false, problem: 'tooShort' };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, problem: 'tooLong' };
  if (!ALLOWED.test(name)) return { ok: false, problem: 'illegalCharacters' };
  if (!HAS_LETTER.test(name)) return { ok: false, problem: 'noLetter' };

  const key = nameKey(name);
  if (taken.some((existing) => nameKey(existing) === key)) {
    return { ok: false, problem: 'duplicate' };
  }

  return { ok: true };
}

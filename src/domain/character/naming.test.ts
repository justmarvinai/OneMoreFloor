import { describe, expect, it } from 'vitest';
import { checkName, nameKey, normalizeName, NAME_MAX_LENGTH } from './naming.ts';

describe('normalizeName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Sir   Gawain  ')).toBe('Sir Gawain');
  });

  it('leaves an already-clean name alone', () => {
    expect(normalizeName('Grimhild')).toBe('Grimhild');
  });
});

describe('nameKey', () => {
  it('ignores case and spacing differences', () => {
    expect(nameKey('Sir  Gawain')).toBe(nameKey('sir gawain'));
  });
});

describe('checkName', () => {
  it('accepts ordinary names', () => {
    for (const name of ['Bob', 'Grimhild', "Sir O'Hara", 'Jean-Luc', 'Ash 7', 'Grímhild']) {
      expect(checkName(name), name).toEqual({ ok: true });
    }
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(checkName('')).toEqual({ ok: false, problem: 'empty' });
    expect(checkName('    ')).toEqual({ ok: false, problem: 'empty' });
  });

  it('enforces the length bounds', () => {
    expect(checkName('Al')).toEqual({ ok: false, problem: 'tooShort' });
    expect(checkName('a'.repeat(NAME_MAX_LENGTH))).toEqual({ ok: true });
    expect(checkName('a'.repeat(NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      problem: 'tooLong',
    });
  });

  it('measures length after normalising, not before', () => {
    expect(checkName('   Bob   ')).toEqual({ ok: true });
  });

  it('rejects characters that would break a label', () => {
    for (const name of ['Bob<script>', 'Bob💀', 'Bob/Alice', 'Bob_Alice', 'Bob​Alice']) {
      expect(checkName(name).problem, name).toBe('illegalCharacters');
    }
  });

  it('folds newlines and tabs into ordinary spaces rather than rejecting them', () => {
    // A pasted name with a stray newline is a typo, not an attack — normalising
    // it is friendlier than refusing it, and the result is still a plain label.
    expect(normalizeName('Bob\nBob')).toBe('Bob Bob');
    expect(checkName('Bob\tBob')).toEqual({ ok: true });
  });

  it('requires at least one letter', () => {
    expect(checkName('123')).toEqual({ ok: false, problem: 'noLetter' });
    expect(checkName("- '")).toEqual({ ok: false, problem: 'noLetter' });
  });

  it('rejects a name already used by one of this player’s characters', () => {
    expect(checkName('Grimhild', ['Grimhild'])).toEqual({ ok: false, problem: 'duplicate' });
  });

  it('treats case and spacing differences as the same name', () => {
    expect(checkName('grimhild', ['Grimhild']).problem).toBe('duplicate');
    expect(checkName('Sir  Gawain', ['sir gawain']).problem).toBe('duplicate');
  });

  it('allows a name that is merely similar', () => {
    expect(checkName('Grimhilda', ['Grimhild'])).toEqual({ ok: true });
  });
});

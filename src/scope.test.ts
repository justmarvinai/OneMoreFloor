/**
 * **The scope nevers, as a test** (Brief §2.2, ROADMAP M10).
 *
 * §2.2 lists things this game must never contain. They are easy to honour on
 * purpose and easy to break by accident — one convenience `fetch` for a leaderboard,
 * one `new Audio()` for a click, and a promise the owner made in writing is gone.
 *
 * So the nevers are grepped rather than remembered. This reads our own source
 * (never the vendored FantasyUI, which is third-party and excluded from linting
 * for the same reason) and fails on the first sign of any of them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Our source, excluding vendored third-party code and the tests themselves. */
function ourSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (path.includes('ui/fui')) continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|css)$/.test(entry) || entry.endsWith('.test.ts')) continue;
      files.push(path);
    }
  };
  walk('src');
  return files;
}

function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of ourSources()) {
    const text = readFileSync(file, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      // Comments are allowed to *name* a never — that is how the rules are
      // documented — so only real code counts.
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (pattern.test(code)) found.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  }
  return found;
}

describe('scope nevers (Brief §2.2)', () => {
  it('ships no audio of any kind', () => {
    expect(
      offenders(/\bnew Audio\b|AudioContext|HTMLAudioElement|<audio\b|\.mp3|\.ogg|\.wav/),
    ).toEqual([]);
  });

  it('never reaches the network', () => {
    // No backend, no accounts, no telemetry (§2.2, §21). The offline smoke test
    // proves the *shipped* build makes no external request; this proves the
    // source has no way to.
    expect(
      offenders(/\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|EventSource|sendBeacon|axios/),
    ).toEqual([]);
  });

  it('keeps exactly one production dependency besides vendored FantasyUI', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['idb']);
  });

  it('has no Electron packaging yet (§2.2), only forward-compatibility', () => {
    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).not.toMatch(/"electron|electron-builder|electron-forge/);
  });

  it('models no second player', () => {
    // Multiplayer/social/PvP is a never *forever* (§1), not just for 0.1. The
    // give-away would be a domain type that names another player.
    expect(offenders(/\bopponentPlayer\b|\bfriendId\b|\bguild\b|\bleaderboard\b|\bpvp\b/i)).toEqual(
      [],
    );
  });
});

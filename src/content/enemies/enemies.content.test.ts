/**
 * Enemy and floor content validation — part of `npm run content:validate`.
 */
import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@/domain/combat/types.ts';
import { en } from '@/strings/en.ts';
import { STAT_IDS } from '@/domain/stats.ts';
import { FLOOR_BANDS, bandForFloor, isBossFloor } from '@/content/floors/index.ts';
import { BOSSES, ENEMIES, getEnemy } from './index.ts';
import { BOSS_DEBUFF_MIN, NORMAL_DEBUFF_MAX } from './effects.ts';
import { ENEMY_MODIFIERS, applyModifier } from './modifiers.ts';

const ALL = [...ENEMIES, ...BOSSES];

describe('bestiary', () => {
  it('gives every enemy a unique id and a real name', () => {
    const ids = ALL.map((enemy) => enemy.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const enemy of ALL) {
      expect(en[enemy.nameKey], `${enemy.id}: missing ${enemy.nameKey}`).toBeTypeOf('string');
    }
  });

  it('binds an avatar for every enemy, falling back to the silhouette (Brief §4.3)', () => {
    for (const enemy of ALL) {
      expect(enemy.avatar, enemy.id).toBeTruthy();
      // Until the owner supplies real portraits, every enemy uses the library's
      // silhouette — and swapping one is this single field.
      expect(enemy.avatar).toBe('silhouette-warrior-m');
    }
  });

  it('uses only real stats in its profiles, with positive multipliers', () => {
    for (const enemy of ALL) {
      for (const [stat, value] of Object.entries(enemy.profile)) {
        expect(STAT_IDS, `${enemy.id}: ${stat}`).toContain(stat);
        expect(value, `${enemy.id}: ${stat}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every enemy a sane floor range and weight', () => {
    for (const enemy of ALL) {
      expect(enemy.floors[0], enemy.id).toBeGreaterThanOrEqual(1);
      expect(enemy.floors[1], enemy.id).toBeGreaterThanOrEqual(enemy.floors[0]);
      expect(enemy.weight, enemy.id).toBeGreaterThan(0);
    }
  });

  it('keeps normal-floor debuffs milder than boss debuffs (Brief §3.2)', () => {
    for (const enemy of ENEMIES) {
      if (!enemy.playerDebuff) continue;
      expect(Math.abs(enemy.playerDebuff.magnitude), enemy.id).toBeLessThanOrEqual(
        NORMAL_DEBUFF_MAX,
      );
    }
    for (const boss of BOSSES) {
      if (!boss.playerDebuff) continue;
      expect(Math.abs(boss.playerDebuff.magnitude), boss.id).toBeGreaterThanOrEqual(
        BOSS_DEBUFF_MIN,
      );
    }
  });

  it('gives every boss a debuff, a self-buff and a signature (Brief §3.2)', () => {
    for (const boss of BOSSES) {
      expect(boss.playerDebuff, boss.id).toBeDefined();
      expect(boss.selfBuff, boss.id).toBeDefined();
      expect(boss.hasSignature, boss.id).toBe(true);
    }
  });

  it('names every effect it references', () => {
    for (const enemy of ALL) {
      const selfBuff = (enemy as { selfBuff?: EffectDef }).selfBuff;
      const effects: Array<EffectDef | undefined> = [enemy.playerDebuff, selfBuff];
      for (const effect of effects) {
        if (!effect) continue;
        expect(en[effect.nameKey as keyof typeof en], effect.id).toBeTypeOf('string');
      }
    }
  });

  it('covers the authored floors with at least one enemy each', () => {
    for (let floor = 1; floor <= 100; floor += 1) {
      if (isBossFloor(floor)) continue;
      const available = ENEMIES.filter(
        (enemy) => floor >= enemy.floors[0] && floor <= enemy.floors[1],
      );
      expect(available.length, `no enemy for floor ${floor}`).toBeGreaterThan(0);
    }
  });

  it('looks enemies up by id', () => {
    expect(getEnemy(ENEMIES[0]!.id)).toBe(ENEMIES[0]);
    expect(getEnemy('enemy.nope')).toBeUndefined();
  });
});

describe('modifiers', () => {
  it('names every modifier and trades one stat for another', () => {
    for (const modifier of ENEMY_MODIFIERS) {
      expect(en[modifier.nameKey], modifier.id).toBeTypeOf('string');
      expect(modifier.raises).not.toBe(modifier.lowers);
      expect(STAT_IDS).toContain(modifier.raises);
      expect(STAT_IDS).toContain(modifier.lowers);
    }
  });

  it('raises one stat and lowers the other, leaving the rest alone', () => {
    const base = { strength: 1, defense: 1 };
    const modified = applyModifier(base, ENEMY_MODIFIERS[0]!);
    expect(modified.strength!).toBeGreaterThan(1);
    expect(modified.defense!).toBeLessThan(1);
  });
});

describe('floor bands (Brief §3.1)', () => {
  it('starts at floor 1 and rises without gaps', () => {
    expect(FLOOR_BANDS[0]!.from).toBe(1);
    for (let index = 1; index < FLOOR_BANDS.length; index += 1) {
      expect(FLOOR_BANDS[index]!.from).toBeGreaterThan(FLOOR_BANDS[index - 1]!.from);
    }
  });

  it('names every band and gives it families that exist in the bestiary', () => {
    const families = new Set(ENEMIES.map((enemy) => enemy.family));
    for (const band of FLOOR_BANDS) {
      expect(en[band.nameKey], band.id).toBeTypeOf('string');
      expect(band.families.length, band.id).toBeGreaterThan(0);
      for (const family of band.families) {
        expect(families, `${band.id}: no enemies in family ${family}`).toContain(family);
      }
    }
  });

  it('places every floor in a band, however deep', () => {
    for (const floor of [1, 14, 15, 60, 101, 5_000, 1_000_000]) {
      expect(bandForFloor(floor), `floor ${floor}`).toBeDefined();
    }
  });
});

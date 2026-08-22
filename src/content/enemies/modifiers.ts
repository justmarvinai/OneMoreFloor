/**
 * Procedural enemy modifiers (CONTENT_PIPELINE §2).
 *
 * The tower is endless (Brief §3.1) but the bestiary is not, so past the
 * hand-authored floors the generator composes an authored enemy with one of
 * these. A modifier **trades** stats rather than adding them, which makes a
 * Frenzied wolf a different fight from a Warded one instead of simply a bigger
 * number — variety the brief asks for at §3.7.
 */
import { MODIFIER_STRENGTH } from '@/content/balance/enemies.ts';
import type { StatId } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

export interface EnemyModifier {
  id: string;
  nameKey: StringKey;
  /** Stats it raises and lowers, as multipliers over the enemy's profile. */
  raises: StatId;
  lowers: StatId;
}

const M = MODIFIER_STRENGTH;

export const ENEMY_MODIFIERS: readonly EnemyModifier[] = [
  { id: 'mod.frenzied', nameKey: 'modifier.frenzied', raises: 'strength', lowers: 'defense' },
  { id: 'mod.armoured', nameKey: 'modifier.armoured', raises: 'defense', lowers: 'speed' },
  { id: 'mod.fleet', nameKey: 'modifier.fleet', raises: 'speed', lowers: 'hp' },
  { id: 'mod.hulking', nameKey: 'modifier.hulking', raises: 'hp', lowers: 'speed' },
  { id: 'mod.cunning', nameKey: 'modifier.cunning', raises: 'luck', lowers: 'strength' },
];

/** Apply a modifier to a stat profile, trading one stat for another. */
export function applyModifier(
  profile: Partial<Record<StatId, number>>,
  modifier: EnemyModifier,
): Partial<Record<StatId, number>> {
  return {
    ...profile,
    [modifier.raises]: (profile[modifier.raises] ?? 1) * (1 + M),
    [modifier.lowers]: (profile[modifier.lowers] ?? 1) * (1 - M),
  };
}

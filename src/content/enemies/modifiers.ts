/**
 * Procedural enemy modifiers (CONTENT_PIPELINE §2).
 *
 * The tower is endless (Brief §3.1) but the bestiary is not, so past the
 * hand-authored floors the generator composes an authored enemy with one of
 * these. A modifier **trades** stats rather than adding them, which makes a
 * Frenzied wolf a different fight from a Warded one instead of simply a bigger
 * number — variety the brief asks for at §3.7.
 *
 * Nine of them, and the pairs are chosen so no two are the same trade read
 * backwards: Frenzied and Warded both touch strength and defence, but a Frenzied
 * enemy races you and a Warded one outlasts you. Thirty enemies times nine
 * modifiers is the deep tower's actual variety, and adding a tenth is a data
 * edit (CONTENT_PIPELINE §4).
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
  { id: 'mod.venomous', nameKey: 'modifier.venomous', raises: 'strength', lowers: 'hp' },
  { id: 'mod.warded', nameKey: 'modifier.warded', raises: 'defense', lowers: 'strength' },
  { id: 'mod.ravenous', nameKey: 'modifier.ravenous', raises: 'hp', lowers: 'defense' },
  { id: 'mod.attuned', nameKey: 'modifier.attuned', raises: 'resource', lowers: 'defense' },
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

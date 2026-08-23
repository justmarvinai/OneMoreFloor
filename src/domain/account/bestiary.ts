/**
 * The bestiary — what the account has actually met (Brief §4.3, Q12).
 *
 * It belongs to the **account** rather than to a character, for the same reason
 * the account slots and Battle Speed do (Q4): what a player has seen of the
 * tower is knowledge, and knowledge is not something a death or a reset should
 * take away. A hero who never left floor 12 still leaves the Warden of the Gate
 * recorded for whoever climbs next.
 *
 * Every authored enemy has an entry from the start, and an unmet one shows as a
 * gap rather than being absent: a list that grows out of nothing tells a player
 * nothing about how much tower is left, and the gaps are the reason to keep
 * climbing. What a gap does *not* show is the name — that is the reward for the
 * first kill.
 */
import { BOSSES, ENEMIES } from '@/content/enemies/index.ts';
import type { BossDef, EnemyDef } from '@/content/enemies/index.ts';
import type { Account } from '../character/types.ts';

export interface BestiaryEntry {
  def: EnemyDef | BossDef;
  /** How many of this enemy the account has killed, across every hero. */
  kills: number;
  /** False until the first kill: the name and the profile stay hidden. */
  seen: boolean;
  isBoss: boolean;
}

/** Everything in the roster, shallowest first, bosses among their own floors. */
export function bestiaryEntries(account: Pick<Account, 'bestiary'>): BestiaryEntry[] {
  const rows: BestiaryEntry[] = [
    ...ENEMIES.map((def) => row(account, def, false)),
    ...BOSSES.map((def) => row(account, def, true)),
  ];
  // Sorted by where a player meets them, so the list reads as a walk up the
  // tower rather than as the order the content file happens to be written in.
  return rows.sort((a, b) => a.def.floors[0] - b.def.floors[0] || compareId(a.def, b.def));
}

function row(
  account: Pick<Account, 'bestiary'>,
  def: EnemyDef | BossDef,
  isBoss: boolean,
): BestiaryEntry {
  const kills = account.bestiary[def.id] ?? 0;
  return { def, kills, seen: kills > 0, isBoss };
}

function compareId(a: EnemyDef, b: EnemyDef): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** How much of the roster has been met, for the header line. */
export function bestiaryProgress(account: Pick<Account, 'bestiary'>): {
  seen: number;
  total: number;
} {
  const total = ENEMIES.length + BOSSES.length;
  let seen = 0;
  for (const entry of bestiaryEntries(account)) if (entry.seen) seen += 1;
  return { seen, total };
}

/**
 * Record kills, returning the account to save.
 *
 * Takes a list rather than one id because a Quick-Raid resolves many floors in
 * one action, and writing the account once per raid rather than once per floor
 * is the difference between one save and twenty.
 */
export function recordKills(account: Account, enemyIds: readonly string[]): Account {
  if (enemyIds.length === 0) return account;

  const bestiary = { ...account.bestiary };
  for (const id of enemyIds) bestiary[id] = (bestiary[id] ?? 0) + 1;
  return { ...account, bestiary };
}

/** True when any of these kills is one the account has never recorded before. */
export function isFirstSighting(account: Pick<Account, 'bestiary'>, enemyId: string): boolean {
  return (account.bestiary[enemyId] ?? 0) === 0;
}

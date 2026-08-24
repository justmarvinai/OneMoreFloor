/**
 * Echoes of the Spire (Q36) — earning them, spending them, and what they do.
 *
 * The permanent layer. Everything else a player builds belongs to one hero and
 * stops when that hero does; echoes are earned by the account, spent by the
 * account, and survive every reset. A death banks something, and the second hero
 * is faster than the first because of what the first did.
 *
 * One rule keeps them honest: **new ground only**. An echo is paid for a floor
 * the account has never cleared, so they cannot be farmed by re-climbing, and a
 * player who has stopped getting further has stopped earning them. The currency's
 * whole job is to reward the one thing the game is about.
 */
import {
  ECHO_MAGNITUDE,
  ECHO_MAX_RANK,
  ECHO_NODE_COST,
  echoesForFloor,
  type EchoNodeId,
} from '@/content/balance/echoes.ts';
import { ECHO_NODES, getEchoNode, type EchoNodeDef } from '@/content/echoes/index.ts';
import type { Account } from '../character/types.ts';

export { ECHO_MAX_RANK, ECHO_NODES, echoesForFloor };
export type { EchoNodeDef, EchoNodeId };

/**
 * Echoes for pushing the record from `from` to `to`.
 *
 * Summed floor by floor rather than taken from the top: a hero who jumps four
 * floors in one Quick-Raid is paid for all four, and one who reaches the same
 * depth slowly is paid exactly the same. Nothing is owed for ground already
 * walked, which is the rule the whole currency rests on.
 */
export function echoesForNewGround(from: number, to: number): number {
  let total = 0;
  for (let floor = Math.max(0, from) + 1; floor <= to; floor += 1) {
    total += echoesForFloor(floor);
  }
  return total;
}

/** Ranks bought in one node. */
export function rankOf(account: Pick<Account, 'echoNodes'>, id: EchoNodeId): number {
  return Math.max(0, Math.min(ECHO_MAX_RANK, Math.floor(account.echoNodes[id] ?? 0)));
}

/** What the next rank costs, or null when the node is finished. */
export function nextRankCost(account: Pick<Account, 'echoNodes'>, id: EchoNodeId): number | null {
  const rank = rankOf(account, id);
  return rank >= ECHO_MAX_RANK ? null : (ECHO_NODE_COST[rank] ?? null);
}

/** Everything a node's card needs, without the screen doing arithmetic. */
export interface EchoNodeStatus {
  def: EchoNodeDef;
  rank: number;
  /** Null when fully bought. */
  cost: number | null;
  affordable: boolean;
  /** What the ranks already bought are worth, in the node's own units. */
  effect: number;
  /** What one more rank would add. */
  step: number;
}

export function echoTree(account: Pick<Account, 'echoNodes' | 'echoes'>): EchoNodeStatus[] {
  return ECHO_NODES.map((def) => {
    const rank = rankOf(account, def.id);
    const cost = nextRankCost(account, def.id);
    return {
      def,
      rank,
      cost,
      affordable: cost !== null && account.echoes >= cost,
      effect: rank * ECHO_MAGNITUDE[def.id],
      step: ECHO_MAGNITUDE[def.id],
    };
  });
}

export type EchoRefusal = 'noSuchNode' | 'maxRank' | 'notEnoughEchoes';

/** Buy one rank. The account is the only thing that changes. */
export function buyEchoRank(account: Account, id: string): Account | EchoRefusal {
  const def = getEchoNode(id);
  if (!def) return 'noSuchNode';

  const cost = nextRankCost(account, def.id);
  if (cost === null) return 'maxRank';
  if (account.echoes < cost) return 'notEnoughEchoes';

  return {
    ...account,
    echoes: account.echoes - cost,
    echoNodes: { ...account.echoNodes, [def.id]: rankOf(account, def.id) + 1 },
  };
}

/** Bank what a climb earned. Returns the account unchanged when it earned none. */
export function grantEchoes(account: Account, amount: number): Account {
  if (amount <= 0) return account;
  return {
    ...account,
    echoes: account.echoes + amount,
    echoesEarned: account.echoesEarned + amount,
  };
}

/**
 * What the tree is worth right now, in the units each caller needs.
 *
 * Returned as one object rather than six getters because every caller that
 * wants one usually wants three, and threading a single value through the
 * reward roll is how a bonus quietly stops being applied.
 */
export interface EchoBonuses {
  /** Multiplier on gold from a floor. */
  gold: number;
  /** Multiplier on experience. */
  xp: number;
  /** Multiplier on material counts. */
  materials: number;
  /** Multiplier on the chance of a ticket. */
  tickets: number;
  /** Fraction taken off the auto-climb's wait. */
  patience: number;
  /** Extra backpack sockets. */
  coffers: number;
}

export function echoBonuses(account: Pick<Account, 'echoNodes'> | null | undefined): EchoBonuses {
  const held = account ?? { echoNodes: {} };
  const scale = (id: EchoNodeId): number => 1 + rankOf(held, id) * ECHO_MAGNITUDE[id];

  return {
    gold: scale('spoils'),
    xp: scale('insight'),
    materials: scale('prospect'),
    tickets: scale('fortune'),
    // Capped below one so a fully-bought Patience still leaves a wait: auto-climb
    // must never become the fastest way to play (Q32).
    patience: Math.min(0.5, rankOf(held, 'patience') * ECHO_MAGNITUDE.patience),
    coffers: rankOf(held, 'coffers') * ECHO_MAGNITUDE.coffers,
  };
}

/** The neutral set, for every caller that has no account in hand. */
export const NO_ECHOES: EchoBonuses = {
  gold: 1,
  xp: 1,
  materials: 1,
  tickets: 1,
  patience: 0,
  coffers: 0,
};

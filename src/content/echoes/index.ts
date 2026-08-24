/**
 * The echo tree (Q36) — what the permanent currency buys.
 *
 * Six nodes, five ranks each. They are deliberately *not* a tree with
 * prerequisites: a lattice of locked branches would make the first purchase the
 * most important decision a player ever makes, at the moment they know least
 * about the game. Six open doors, each priced the same, lets them speed up
 * whatever is annoying them today and change their mind later.
 *
 * What each rank is worth lives in `content/balance/echoes.ts` (§3.7); this file
 * says which nodes exist and what they are called.
 */
import type { EchoNodeId } from '@/content/balance/echoes.ts';
import type { StringKey } from '@/strings/index.ts';

export interface EchoNodeDef {
  id: EchoNodeId;
  nameKey: StringKey;
  descKey: StringKey;
  /** Glyph asset id for the node's card. */
  glyph: string;
}

export const ECHO_NODES: readonly EchoNodeDef[] = [
  {
    id: 'spoils',
    nameKey: 'echo.spoils',
    descKey: 'echo.spoils.desc',
    glyph: 'glyph-trophy-cup',
  },
  {
    id: 'insight',
    nameKey: 'echo.insight',
    descKey: 'echo.insight.desc',
    glyph: 'glyph-spell-book',
  },
  {
    id: 'prospect',
    nameKey: 'echo.prospect',
    descKey: 'echo.prospect.desc',
    glyph: 'glyph-arcane-symbol',
  },
  {
    id: 'fortune',
    nameKey: 'echo.fortune',
    descKey: 'echo.fortune.desc',
    glyph: 'glyph-shooting-stars',
  },
  {
    id: 'patience',
    nameKey: 'echo.patience',
    descKey: 'echo.patience.desc',
    glyph: 'glyph-hourglass',
  },
  {
    id: 'coffers',
    nameKey: 'echo.coffers',
    descKey: 'echo.coffers.desc',
    glyph: 'glyph-broken-shackle',
  },
];

export function getEchoNode(id: string): EchoNodeDef | undefined {
  return ECHO_NODES.find((node) => node.id === id);
}

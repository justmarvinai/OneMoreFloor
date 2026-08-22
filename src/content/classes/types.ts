/**
 * The shape of a class definition.
 *
 * Classes are data (Brief §2.3): a sixth class is a new file in this folder plus
 * art, with no change to game logic. Everything player-facing is a `StringKey`
 * rather than a literal, so the whole roster localises as content (Q24).
 *
 * Combat parameters — resource fill amounts, signature-move scaling — join this
 * shape in M3, where the engine that consumes them is built (COMBAT.md §5). What
 * lives here now is what hero creation and the character sheet actually read.
 */
import type { ClassId, ResourceKind, WeaponRule } from '@/domain/character/types.ts';
import type { GrowableStats } from '@/domain/stats.ts';
import type { StringKey } from '@/strings/index.ts';

/** The signature move a full resource bar spends itself on (Q6/Q26). */
export interface SignatureMove {
  nameKey: StringKey;
  descriptionKey: StringKey;
  /** Line-glyph asset id, drawn as a mask by FantasyUI. */
  glyph: string;
}

export interface ClassDef {
  id: ClassId;
  nameKey: StringKey;
  /** One-line hook shown on the class card. */
  taglineKey: StringKey;
  /** The longer pitch: what playing this class feels like, upside and downside. */
  descriptionKey: StringKey;
  resource: {
    kind: ResourceKind;
    nameKey: StringKey;
    /** How the bar fills, in words. The mechanics arrive with the engine (M3). */
    fillDescriptionKey: StringKey;
  };
  signature: SignatureMove;
  weaponRule: WeaponRule;
  /** Weapon loadout in words, for the class card (Brief §8.1, Q15). */
  weaponDescriptionKey: StringKey;
  /** Level-1 stats. Speed is absent by type: gear is its only source (§6). */
  baseStats: GrowableStats;
  /** Added per level. Fractional values are floored when stats are computed. */
  statGrowthPerLevel: GrowableStats;
  art: {
    /** Portrait asset id, registered as `--fui-img-<id>` in src/styles/art.css. */
    portrait: string;
    /** Line-glyph asset id used as the class mark. */
    glyph: string;
  };
  /** How demanding the class is to play well, 1–3. Shown on the creator card. */
  difficulty: 1 | 2 | 3;
}

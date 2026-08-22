/**
 * Effect artwork.
 *
 * Effects are bound to icons by what they *do* rather than one-by-one: a
 * strength debuff and a strength buff share a glyph and differ by the chip's
 * rim colour, which is the reading a player learns once and then knows forever.
 * Deriving it also means no effect can ever ship without art — the failure mode
 * a hand-authored table invites (Brief §2.1).
 */
import type { EffectDef } from '@/domain/combat/types.ts';
import type { StatId } from '@/domain/stats.ts';

/**
 * Painted icon art, not line glyphs. FantasyUI's `glyph-*` set is
 * `fill="currentColor"` SVG meant to be used as a CSS mask — the components that
 * take a `glyph` option do exactly that. `BuffBar` takes an `icon` and paints it
 * as a background image, where `currentColor` resolves to black and the chip
 * comes out empty. Full-colour art is what that slot wants.
 */
const BY_STAT: Record<StatId, string> = {
  strength: 'skill-titan-fist',
  defense: 'crest-stone-guard',
  hp: 'icon-heart',
  resource: 'orb-arcane',
  luck: 'rune-jade-coin',
  speed: 'fx-storm-bolt',
};

export function iconForEffect(effect: EffectDef): string {
  switch (effect.kind) {
    case 'damageReduction':
      return 'crest-warded-shield';
    case 'dodgeNext':
      return 'hunt-bird-flight';
    case 'statScale':
      return effect.stat ? BY_STAT[effect.stat] : 'orb-arcane';
  }
}

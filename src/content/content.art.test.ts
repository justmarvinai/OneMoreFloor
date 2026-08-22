/**
 * Art binding validation — part of `npm run content:validate`.
 *
 * CONTENT_PIPELINE §4 asks for dangling-reference checks, and art is where they
 * bite hardest: a mistyped id renders as an empty frame rather than an error, so
 * nothing fails until someone looks at the screen. This sweeps every id content
 * binds and proves the artwork behind it exists.
 *
 * The stylesheets are read as files rather than imported, because content must
 * never import ui/ (ARCHITECTURE §3).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '@/content/classes/index.ts';
import { FLOOR_BANDS } from '@/content/floors/index.ts';
import { ITEM_BASES } from '@/content/items/bases.ts';
import { MATERIALS } from '@/content/items/materials.ts';

/** Every art id the game can render, read from the CSS that declares them. */
const ART_IDS = new Set(
  ['src/ui/fui/styles/assets.css', 'src/styles/art.css'].flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/--fui-img-([a-z0-9-]+)\s*:/g)].map(
      (match) => match[1]!,
    ),
  ),
);

/**
 * FantasyUI's `glyph-*` art is `fill="currentColor"` SVG, drawn by the
 * components that mask it. Painted as a background image — which is what an
 * `icon` slot does — it resolves to black and disappears. Content therefore
 * binds icons to painted art, never to glyphs.
 */
const isGlyph = (id: string): boolean => id.startsWith('glyph-');

describe('art bindings', () => {
  it('binds every class portrait and glyph to real artwork', () => {
    for (const definition of Object.values(CLASSES)) {
      expect(ART_IDS, definition.id).toContain(definition.art.portrait);
      expect(ART_IDS, definition.id).toContain(definition.art.glyph);
    }
  });

  it('binds every item icon to painted artwork (Q27)', () => {
    for (const base of ITEM_BASES) {
      expect(ART_IDS, `${base.id}: no artwork for "${base.icon}"`).toContain(base.icon);
      expect(isGlyph(base.icon), `${base.id}: icons must be painted art, not a glyph`).toBe(false);
    }
  });

  it('binds every material icon to painted artwork', () => {
    for (const material of MATERIALS) {
      expect(ART_IDS, `${material.id}: no artwork for "${material.icon}"`).toContain(material.icon);
      expect(isGlyph(material.icon), material.id).toBe(false);
    }
  });

  it('gives every floor band a backdrop that exists (Q11)', () => {
    for (const band of FLOOR_BANDS) {
      expect(ART_IDS, `${band.id}: no artwork for "${band.backdrop}"`).toContain(band.backdrop);
    }
  });
});

/**
 * The class roster.
 *
 * Exactly five in EA 0.1 (Brief §2.2/§8). Adding a sixth later is a new file
 * here, its strings, its art, and one line in this registry — no logic changes
 * (Brief §2.3).
 */
import { CLASS_IDS, type ClassId } from '@/domain/character/types.ts';
import { bard } from './bard.ts';
import { hunter } from './hunter.ts';
import { mage } from './mage.ts';
import { swashbuckler } from './swashbuckler.ts';
import { warrior } from './warrior.ts';
import type { ClassDef } from './types.ts';

export type { ClassDef, SignatureMove } from './types.ts';

export const CLASSES: Readonly<Record<ClassId, ClassDef>> = {
  warrior,
  mage,
  hunter,
  bard,
  swashbuckler,
};

/** The roster in display order — the order the brief lists them in (§8). */
export const CLASS_LIST: readonly ClassDef[] = CLASS_IDS.map((id) => CLASSES[id]);

export function getClass(id: ClassId): ClassDef {
  return CLASSES[id];
}

/** Narrow an untrusted string (a save field, a URL) to a real class id. */
export function isClassId(value: unknown): value is ClassId {
  return typeof value === 'string' && (CLASS_IDS as readonly string[]).includes(value);
}

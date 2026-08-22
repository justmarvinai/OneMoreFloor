/**
 * String lookup.
 *
 * `t('error.detail', { detail })` interpolates `{name}` placeholders. Keys are
 * typed, so a renamed string breaks the build instead of shipping a blank label.
 */
import { en, type StringKey } from './en.ts';

export type { StringKey } from './en.ts';

export type StringParams = Readonly<Record<string, string | number>>;

const table: Readonly<Record<StringKey, string>> = en;

export function t(key: StringKey, params?: StringParams): string {
  const template = table[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

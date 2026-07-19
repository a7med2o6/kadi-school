import { en } from './en';
import { ar } from './ar';
import type { Locale, Dictionary } from './types';

export type { Locale, Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

/** Replaces `{key}` placeholders — e.g. interpolate(t.dashboard.subtitle, { school: 'x', date: 'y' }). */
export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

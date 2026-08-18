import { useCallback } from 'react';
import { ru, type RuDictionary } from './ru';
import { en } from './en';
import { useAppStore } from '../store/appStore';
import type { Locale } from '../types';

export type { RuDictionary };

// Nested dictionary paths become dotted keys, e.g. 'chat.iterations' or
// 'errors.serverError'. Derived from the Russian dictionary so `t()` calls
// are checked at compile time.
type NestedKeys<T> = {
  [K in keyof T & string]: T[K] extends string | ((n: number) => string)
    ? K
    : T[K] extends object
      ? `${K}.${NestedKeys<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = NestedKeys<RuDictionary>;

export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Locale, RuDictionary> = { ru, en };

function resolve(dict: RuDictionary, key: TranslationKey): string | ((n: number) => string) {
  return key.split('.').reduce<string | ((n: number) => string) | object>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part] as string | ((n: number) => string);
    }
    return acc;
  }, dict as object) as string | ((n: number) => string);
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translate a dotted key into the active locale's string.
 *
 * Works both inside React (via `useT()`, re-renders on locale change) and in
 * plain modules: it reads the current locale straight from the store.
 *
 * - `{param}` placeholders are interpolated from `params`.
 * - Keys whose value is a function (pluralization) receive `params.n`.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const locale = useAppStore.getState().locale;
  const value = resolve(dictionaries[locale], key);
  if (typeof value === 'function') {
    return value(typeof params?.n === 'number' ? params.n : 0);
  }
  return interpolate(value, params);
}

export const translate = t;

/**
 * React hook: returns the translation function plus the current locale and a
 * setter. Subscribes to the store so switching language re-renders callers.
 */
export function useT() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const translateFn = useCallback(t, []);
  return { t: translateFn, locale, setLocale };
}

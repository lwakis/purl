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

export interface LocalizedTemplate {
  title: string;
  description: string;
  prompt_text: string;
}

const templateItemKeys: Record<
  string,
  { title: TranslationKey; description: TranslationKey; prompt: TranslationKey }
> = {
  landing: {
    title: 'templates.items.landing.title',
    description: 'templates.items.landing.description',
    prompt: 'templates.items.landing.prompt',
  },
  dashboard: {
    title: 'templates.items.dashboard.title',
    description: 'templates.items.dashboard.description',
    prompt: 'templates.items.dashboard.prompt',
  },
  form: {
    title: 'templates.items.form.title',
    description: 'templates.items.form.description',
    prompt: 'templates.items.form.prompt',
  },
  pricing: {
    title: 'templates.items.pricing.title',
    description: 'templates.items.pricing.description',
    prompt: 'templates.items.pricing.prompt',
  },
  onboarding: {
    title: 'templates.items.onboarding.title',
    description: 'templates.items.onboarding.description',
    prompt: 'templates.items.onboarding.prompt',
  },
  content: {
    title: 'templates.items.content.title',
    description: 'templates.items.content.description',
    prompt: 'templates.items.content.prompt',
  },
  portfolio: {
    title: 'templates.items.portfolio.title',
    description: 'templates.items.portfolio.description',
    prompt: 'templates.items.portfolio.prompt',
  },
  contact: {
    title: 'templates.items.contact.title',
    description: 'templates.items.contact.description',
    prompt: 'templates.items.contact.prompt',
  },
};

/**
 * Localized content for a backend starter template, keyed by its category.
 * Backend seeds are stored in Russian, so non-RU locales get dictionary
 * overrides; RU (and unknown categories) fall back to backend-provided text.
 */
export function localizeTemplate(category: string | null | undefined): LocalizedTemplate | null {
  if (!category) return null;
  const keys = templateItemKeys[category.toLowerCase()];
  if (!keys) return null;
  if (useAppStore.getState().locale === 'ru') return null;
  return {
    title: t(keys.title),
    description: t(keys.description),
    prompt_text: t(keys.prompt),
  };
}

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

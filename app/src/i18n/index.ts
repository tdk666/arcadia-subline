/**
 * i18n minimaliste maison (~60 lignes utiles) : pas de dépendance, typage
 * complet des clés, interpolation {param}. FR par défaut, EN prêt.
 * Arbitrage : i18next pèserait ~15 ko gz pour deux locales statiques — inutile
 * tant que le contenu vit dans /content et les libellés UI ici.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fr, type Dict } from './fr';
import { en } from './en';

export type Locale = 'fr' | 'en';
const DICTS: Record<Locale, Dict> = { fr, en };
const STORAGE_KEY = 'arcadia.locale';

/** Chemins feuilles du dictionnaire ("station.tiers.bronze", …) */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type I18nKey = Leaves<Dict>;

function lookup(dict: Dict, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : key;
}

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
    return navigator.language.startsWith('en') ? 'en' : 'fr';
  });

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
    document.documentElement.lang = l;
  }, []);

  // reflète la locale détectée dès le 1er rendu (a11y / SEO : <html lang>)
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const t = useCallback(
    (key: I18nKey, params?: Record<string, string | number>) => {
      let s = lookup(DICTS[locale], key);
      if (params) {
        for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n hors de <I18nProvider>');
  return ctx;
}

/** Texte localisé venant de /content : { fr: "...", en: "..." } */
export type LocalizedText = Record<string, string>;
export function pickText(lt: LocalizedText, locale: Locale): string {
  return lt[locale] ?? lt.fr ?? Object.values(lt)[0] ?? '';
}

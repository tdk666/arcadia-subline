/**
 * Logique de rang/XP — partagée par la barre de statut et le profil (source
 * unique, pas de seuils dupliqués). La courbe de progression rend la conquête
 * lisible (cf. Duolingo : une identité qui monte avec l'usage).
 */
import type { I18nKey } from '../i18n';

/** Paliers d'XP des rangs — la courbe de progression. */
export const RANK_STEPS = [0, 800, 2000, 4000, 8000];

/** Titre révolutionnaire selon l'XP — l'identité progresse avec la conquête. */
export function rankTier(xp: number): 'r0' | 'r1' | 'r2' | 'r3' | 'r4' | 'r5' {
  return xp >= 8000 ? 'r5' : xp >= 4000 ? 'r4' : xp >= 2000 ? 'r3' : xp >= 800 ? 'r2' : xp > 0 ? 'r1' : 'r0';
}

export function rankLabel(t: (k: I18nKey) => string, xp: number): string {
  return t(`profile.ranks.${rankTier(xp)}` as I18nKey);
}

/** Progression vers le rang suivant (courbe d'XP rendue visible). */
export function rankProgress(xp: number): { pct: number; next: number | null; remaining: number } {
  const nextIdx = RANK_STEPS.findIndex((v) => xp < v);
  if (nextIdx === -1) return { pct: 100, next: null, remaining: 0 };
  const prev = RANK_STEPS[nextIdx - 1] ?? 0;
  const next = RANK_STEPS[nextIdx];
  return { pct: Math.round(((xp - prev) / (next - prev)) * 100), next, remaining: next - xp };
}

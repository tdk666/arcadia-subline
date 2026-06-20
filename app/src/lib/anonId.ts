/**
 * Identifiant anonyme d'appareil — permet de cohorter les invités (rétention J1)
 * AVANT toute inscription. Pas de PII : un simple uuid local, persistant.
 * Module isolé (zéro dépendance) pour être partagé par analytics + backend sans
 * créer de cycle d'import.
 */
const KEY = 'arcadia.anon.v1';

export function getAnonId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = (globalThis.crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return 'anon-unknown';
  }
}

/**
 * Partage natif — le premier vecteur d'acquisition organique (DA Partie V,
 * persona Collégiens : « la vanité est le premier vecteur d'acquisition »).
 * Utilise l'API Web Share (Snapchat/TikTok/Messages depuis la « thumb zone »),
 * avec repli presse-papier puis no-op. Best-effort, ne lève jamais, instrumenté.
 */
import { track } from './analytics';

export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

/** True si un partage natif est disponible (sinon on proposera un repli copie). */
export function canShareNative(): boolean {
  try { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; }
  catch { return false; }
}

/**
 * Tente le partage. Renvoie 'shared' (feuille native), 'copied' (presse-papier),
 * ou 'unavailable'. L'annulation utilisateur renvoie 'shared' (pas une erreur).
 */
export async function share(payload: SharePayload, where = 'unknown'): Promise<'shared' | 'copied' | 'unavailable'> {
  const url = payload.url ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (canShareNative()) {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url });
      track('share', { where, method: 'native' });
      return 'shared';
    } catch (e) {
      // AbortError = l'utilisateur a fermé la feuille : ce n'est pas un échec
      if (e instanceof DOMException && e.name === 'AbortError') {
        track('share_cancel', { where });
        return 'shared';
      }
      // sinon on bascule sur le repli copie
    }
  }
  try {
    const txt = url ? `${payload.text} ${url}` : payload.text;
    await navigator.clipboard.writeText(txt);
    track('share', { where, method: 'clipboard' });
    return 'copied';
  } catch {
    track('share_fail', { where });
    return 'unavailable';
  }
}

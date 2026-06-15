/**
 * Instrumentation produit — privacy-first, sans dépendance, sans PII, sans cookie.
 * On PLACE les events maintenant (le plus dur) ; le SINK est branchable plus tard
 * (Plausible/PostHog/Supabase) sans toucher aux call-sites. La thèse d'Arcadia est
 * « rétention = revenu » → il faut mesurer le funnel dès aujourd'hui.
 */
type Props = Record<string, string | number | boolean | null | undefined>;

const BUFFER_KEY = 'arcadia.events.v1';
const MAX_BUFFER = 100;

/** Tampon local (anneau) : utile au QA / debug et comme file d'attente d'envoi. */
function persist(ev: Props & { t: number; name: string }) {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    const arr: unknown[] = raw ? JSON.parse(raw) : [];
    arr.push(ev);
    if (arr.length > MAX_BUFFER) arr.splice(0, arr.length - MAX_BUFFER);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(arr));
  } catch { /* quota/SSR : on ignore, jamais bloquant */ }
}

/** Émet un event. Ne lève jamais — l'analytics ne doit jamais casser le jeu. */
export function track(name: string, props: Props = {}) {
  const ev = { t: Date.now(), name, ...props };
  try { if (import.meta.env.DEV) console.debug('[evt]', name, props); } catch { /* noop */ }
  persist(ev);
  // sinks optionnels (branchés sans modifier les appels) :
  try {
    (window as unknown as { plausible?: (n: string, o?: { props?: Props }) => void })
      .plausible?.(name, { props });
  } catch { /* noop */ }
}

/** Lecture du tampon (debug / future synchro serveur). */
export function readEvents(): unknown[] {
  try { return JSON.parse(localStorage.getItem(BUFFER_KEY) ?? '[]'); } catch { return []; }
}

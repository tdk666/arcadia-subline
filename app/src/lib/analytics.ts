/**
 * Instrumentation produit — privacy-first, sans PII, sans cookie.
 * `track()` reste l'API unique des call-sites. Le SINK serveur (table events)
 * est branché ici : un outbox en mémoire est vidé périodiquement et aux moments
 * critiques (onglet caché / page quittée) vers backend.logEvents(). Best-effort,
 * jamais bloquant, ne lève jamais. La thèse « rétention = revenu » exige qu'on
 * mesure le funnel (J1/J7) en réel.
 */
import { backend } from './backend';

type Props = Record<string, string | number | boolean | null | undefined>;

const BUFFER_KEY = 'arcadia.events.v1';
const MAX_BUFFER = 100;
const FLUSH_EVERY_MS = 10_000;

interface OutEvent { name: string; props: Record<string, unknown>; clientTs: number }

/** File d'envoi en mémoire (vidée vers le serveur). */
let outbox: OutEvent[] = [];
let started = false;

/** Tampon local (anneau) : utile au QA / debug. */
function persist(ev: Props & { t: number; name: string }) {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    const arr: unknown[] = raw ? JSON.parse(raw) : [];
    arr.push(ev);
    if (arr.length > MAX_BUFFER) arr.splice(0, arr.length - MAX_BUFFER);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(arr));
  } catch { /* quota/SSR : on ignore, jamais bloquant */ }
}

/** Vide l'outbox vers le sink serveur. Best-effort : re-queue borné si échec. */
export function flushEvents(): void {
  if (outbox.length === 0) return;
  const batch = outbox;
  outbox = [];
  try {
    void backend.logEvents(batch).catch(() => {
      // remet en file (borné) pour retenter au prochain flush (offline/tunnel)
      outbox = [...batch, ...outbox].slice(0, MAX_BUFFER);
    });
  } catch {
    outbox = [...batch, ...outbox].slice(0, MAX_BUFFER);
  }
}

/** Démarre les déclencheurs de flush (idempotent, navigateur uniquement). */
function ensureStarted() {
  if (started || typeof window === 'undefined') return;
  started = true;
  setInterval(flushEvents, FLUSH_EVERY_MS);
  // moments critiques : on ne perd pas la fin de session
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  window.addEventListener('pagehide', flushEvents);
}

/** Émet un event. Ne lève jamais — l'analytics ne doit jamais casser le jeu. */
export function track(name: string, props: Props = {}) {
  const t = Date.now();
  try { if (import.meta.env.DEV) console.debug('[evt]', name, props); } catch { /* noop */ }
  persist({ t, name, ...props });
  // props jsonb propre : on retire undefined/null
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) clean[k] = v;
  outbox.push({ name, props: clean, clientTs: t });
  if (outbox.length > MAX_BUFFER) outbox = outbox.slice(-MAX_BUFFER);
  ensureStarted();
}

/** Lecture du tampon (debug). */
export function readEvents(): unknown[] {
  try { return JSON.parse(localStorage.getItem(BUFFER_KEY) ?? '[]'); } catch { return []; }
}

/**
 * « L'ÉMERGENCE » — séquence-titre jouable d'accueil (FTUE).
 * Enacte le mythe fondateur (Ligne 6) ET la dualité de DA : Châssis SOMBRE
 * (marque, Acier Obscur) → Couche Ville CLAIRE (Paris, Craie). Marc BOUGE et
 * GUIDE à chaque beat (Rive si marc.riv présent, sinon doublure animée).
 *
 * Invariants FTUE : ZÉRO score serveur (points = décor local) · portrait ·
 * guest-first · tricolore = écran Conquête SEULEMENT · reduced-motion = repli ·
 * skippable à tout instant (skip → carte). Conserve onDone/onStart + ONBOARDING_KEY.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { tap, haptic } from '../../lib/feedback';
import { track } from '../../lib/analytics';
import { Button } from '../Button';
import { ONBOARDING_KEY } from '../../lib/ftue';
import { MarcGuide, type MarcState } from './MarcGuide';

type Act = 'tunnel' | 'emergence' | 'quiz' | 'reveal' | 'conquest' | 'epilogue';

// DA : source unique = tokens @theme (app/src/index.css). Pas de hex de marque en dur.
const ACIER = 'var(--color-acier)';
const CRAIE = 'var(--color-craie)';

export function Emergence({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const { t } = useI18n();
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const beat = (ms: number) => (reduced ? Math.min(ms, 600) : ms);

  const [act, setAct] = useState<Act>('tunnel');
  const [marc, setMarc] = useState<MarcState>('entree');
  const [speaking, setSpeaking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => { track('ftue_emergence_start'); }, []);

  const mark = () => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ } };
  const skip = () => { track('ftue_skip', { act }); mark(); onDone(); };
  const start = () => { tap(); track('ftue_done'); mark(); (onStart ?? onDone)(); };

  // ── Timeline des actes ──────────────────────────────────────────────────
  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (act === 'tunnel') {
      setMarc('entree');
      after(beat(900), () => setMarc('salut'));
      after(beat(3300), () => setAct('emergence'));
    } else if (act === 'emergence') {
      setMarc('pointe');
      after(beat(2400), () => { setAct('quiz'); setMarc('pointe'); after(beat(700), () => setMarc('idle')); });
    } else if (act === 'conquest') {
      setMarc('celebre'); haptic([40, 60, 90]);
      after(beat(2700), () => setAct('epilogue'));
    } else if (act === 'epilogue') {
      setMarc('idle'); after(beat(500), () => setMarc('salut'));
    }
    // 'quiz' & 'reveal' avancent sur interaction
  }, [act, after]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(choice: string, correct: boolean) {
    if (picked) return;
    tap();
    setPicked(choice);
    setMarc(correct ? 'acquiesce' : 'reconforte');
    haptic(correct ? [30] : [55, 40, 55]);
    after(beat(1200), () => { setAct('reveal'); setSpeaking(true); setMarc('pointe'); after(beat(2600), () => setSpeaking(false)); });
  }

  const dark = act === 'tunnel';

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col overflow-hidden"
      style={{ background: dark ? ACIER : CRAIE, transition: 'background 0.6s ease', color: dark ? 'var(--color-craie)' : 'var(--color-pierre)' }}
    >
      {/* bascule sombre→clair : voile clair qui balaie l'écran à l'émergence */}
      {act === 'emergence' && (
        <div className="ftue-flood pointer-events-none absolute inset-0 z-0" style={{ background: CRAIE }} />
      )}

      {/* Passer (toujours dispo) */}
      <button
        type="button"
        onClick={skip}
        className="absolute right-4 top-[max(env(safe-area-inset-top),1rem)] z-30 rounded-full px-3.5 py-1.5 font-mono text-xs backdrop-blur active:scale-95"
        style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(244,238,218,0.7)' : 'var(--color-pierre-faint)' }}
      >
        {t('ftue.skip')} ›
      </button>

      {/* ════ SCÈNE (haut) ════ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-7 text-center">
        {/* ACTE 0 — TUNNEL (marque, sombre) */}
        {act === 'tunnel' && (
          <>
            {/* phare + rame MP59 stylisée */}
            <div className="relative mb-2 h-28 w-full">
              <svg viewBox="0 0 320 120" className="h-full w-full" aria-hidden>
                <defs>
                  <radialGradient id="ftue-glow"><stop offset="0" stopColor="#f2c200" stopOpacity="0.9" /><stop offset="1" stopColor="#f2c200" stopOpacity="0" /></radialGradient>
                </defs>
                <circle className="ftue-headlight" cx="232" cy="64" r="60" fill="url(#ftue-glow)" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                {/* rame mint */}
                <g className="animate-slide-up">
                  <rect x="40" y="40" width="180" height="48" rx="12" fill="#8fc9b9" stroke="#cfe0d9" strokeWidth="2" />
                  <rect x="52" y="50" width="34" height="20" rx="4" fill="#0c2230" opacity="0.85" />
                  <rect x="96" y="50" width="34" height="20" rx="4" fill="#0c2230" opacity="0.85" />
                  <circle cx="212" cy="64" r="6" fill="#f2c200" />
                </g>
              </svg>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--color-ambre)' }}>{t('ftue.tunnelKicker')}</p>
            {/* wordmark — héros (placeholder Space Grotesk : Outfit ExtraBold serré) */}
            <h1 className="mt-2 font-display text-[clamp(2rem,9vw,3.2rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em]" style={{ color: 'var(--color-craie)' }}>
              Arcadia<br /><span style={{ color: 'var(--color-laiton-clair)' }}>SubLine</span>
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'rgba(244,238,218,0.7)' }}>{t('ftue.tunnelSub')}</p>
          </>
        )}

        {/* ACTE 1 — ÉMERGENCE (bascule) */}
        {act === 'emergence' && (
          <>
            {/* plaque émaillée qui se tamponne */}
            <div className="animate-stamp rounded-xl px-7 py-4" style={{ background: 'var(--color-email)', boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.9), 0 10px 26px rgba(0,0,0,0.25)' }}>
              <span className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">Louvre — Rivoli</span>
            </div>
            <p className="animate-slide-up mt-6 max-w-xs text-[15px] leading-relaxed" style={{ color: 'var(--color-pierre-dim)', animationDelay: '0.2s' }}>
              {t('ftue.emergence')}
            </p>
          </>
        )}

        {/* ACTE 2 — QUIZ (clair) */}
        {act === 'quiz' && (
          <div className="w-full">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-pierre-faint">{t('ftue.qHint')}</p>
            <h2 className="mx-auto mt-2 max-w-sm font-display text-[clamp(1.3rem,5.5vw,1.9rem)] font-extrabold leading-tight text-pierre">
              {t('ftue.q')}
            </h2>
          </div>
        )}

        {/* ACTE 3 — REVEAL (ligne Malraux + archive) */}
        {act === 'reveal' && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => { localStorage.setItem('arcadia.archive.seen.louvre-rivoli', '1'); setAct('conquest'); }}
              className="mx-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left active:scale-[0.98]"
              style={{ borderColor: 'rgba(63,107,77,0.5)', background: 'rgba(63,107,77,0.08)' }}
            >
              <span className="animate-glow flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 text-xl" style={{ borderColor: 'var(--color-guimard)', color: 'var(--color-guimard)' }}>⚜</span>
              <span className="flex-1">
                <span className="block font-display text-sm font-bold" style={{ color: 'var(--color-guimard)' }}>{t('ftue.archive')}</span>
                <span className="block font-mono text-[10px] text-pierre-faint">{t('ftue.archiveNum')}</span>
              </span>
            </button>
            <p className="animate-slide-up mx-auto mt-5 max-w-sm font-display text-[clamp(1.2rem,5vw,1.6rem)] font-extrabold italic leading-snug text-pierre" style={{ animationDelay: '0.15s' }}>
              « {t('ftue.reveal')} »
            </p>
          </div>
        )}

        {/* ACTE 4 — CONQUÊTE (clair + tricolore SACRÉ, ici seulement) */}
        {act === 'conquest' && (
          <>
            {/* gerbe tricolore (uniquement cet écran) */}
            <div className="pointer-events-none absolute inset-0 z-0 flex justify-center gap-2 overflow-hidden">
              {['var(--color-email)', '#ffffff', 'var(--color-vermillon)'].map((c, i) => (
                <span key={c} className="ftue-tricolore mt-[-20%] h-[140%] w-7 rounded-full" style={{ background: c, opacity: 0.85, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <div className="relative z-10">
              <span className="animate-pop inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: 'var(--color-laiton-clair)', boxShadow: '0 8px 24px rgba(242,194,0,0.45)' }}>★</span>
              <h2 className="animate-slide-up mt-4 font-display text-3xl font-extrabold text-pierre">{t('ftue.conquest')}</h2>
              <p className="mt-1 text-sm text-pierre-dim">{t('ftue.conquestSub')}</p>
            </div>
          </>
        )}

        {/* ACTE 5 — ÉPILOGUE (guest-first) */}
        {act === 'epilogue' && (
          <>
            <h2 className="animate-slide-up font-display text-3xl font-extrabold leading-tight text-pierre">{t('ftue.epilogue')}</h2>
            <p className="mt-2 text-sm text-pierre-dim">{t('ftue.epilogueSub')}</p>
          </>
        )}
      </div>

      {/* ════ MARC (bas-centre, toujours présent — il guide) ════ */}
      <div className="relative z-10 flex flex-none items-end justify-center" style={{ height: 168 }}>
        <MarcGuide state={marc} speaking={speaking} size={160} />
      </div>

      {/* ════ ZONE D'ACTION (bas — pouce) ════ */}
      <div className="relative z-20 px-5 pb-[max(env(safe-area-inset-bottom),1.2rem)]">
        {act === 'quiz' && (
          <div className="flex flex-col gap-2.5">
            {([['a', t('ftue.a1'), true], ['b', t('ftue.a2'), false], ['c', t('ftue.a3'), false]] as const).map(([id, label, correct]) => {
              const isPicked = picked === id;
              const reveal = picked !== null;
              let bg = 'var(--color-plomb)', border = 'var(--color-rail)', fg = 'var(--color-pierre)';
              if (reveal && correct) { bg = 'var(--color-guimard)'; border = 'var(--color-guimard)'; fg = '#fff'; }
              else if (reveal && isPicked && !correct) { bg = 'var(--color-vermillon)'; border = 'var(--color-vermillon)'; fg = '#fff'; }
              else if (reveal) { fg = 'var(--color-pierre-dim)'; }
              return (
                <button
                  key={id} type="button" disabled={reveal}
                  onClick={() => answer(id, correct)}
                  className={`rounded-2xl px-4 py-3.5 text-left font-semibold ${reveal ? '' : 'active:scale-[0.98]'}`}
                  style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1.5px ${border}`, opacity: reveal && !correct && !isPicked ? 0.55 : 1 }}
                >
                  {reveal && correct ? '✓ ' : reveal && isPicked ? '✕ ' : ''}{label}
                </button>
              );
            })}
          </div>
        )}

        {act === 'reveal' && (
          <Button variant="gold" size="md" onClick={() => { tap(); setAct('conquest'); }}>{t('ftue.revealCta')}</Button>
        )}

        {act === 'epilogue' && (
          <Button variant="gold" size="md" className="animate-glow" onClick={start}>⚜ {t('ftue.cta')}</Button>
        )}
      </div>
    </div>
  );
}

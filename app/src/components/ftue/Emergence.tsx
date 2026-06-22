/**
 * « L'ÉMERGENCE » — séquence-titre d'accueil, registre ÉMERVEILLEMENT CINÉMATIQUE
 * (réf. Sky / Monument Valley). Enacte le mythe Ligne 6 et la dualité de DA :
 * Châssis SOMBRE (Acier) → Couche Ville CLAIRE (Craie). On ne RACONTE pas le
 * concept, on le RÉVÈLE : le tunnel du quotidien s'ouvre, Paris devient un
 * plateau vivant, chaque station une histoire à conquérir.
 *
 * Tempo HYBRIDE : chaque temps respire et se déroule seul, mais un tap précipite
 * le suivant (skip-ahead) ; « Passer » toujours dispo. Sound design en couches
 * (WebAudio, débloqué au 1er geste). Invariants FTUE : zéro score serveur,
 * portrait, guest-first, tricolore = conquête only, reduced-motion = repli,
 * skippable → carte. Conserve onDone/onStart + ONBOARDING_KEY.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { tap as hapticTap, haptic } from '../../lib/feedback';
import { track } from '../../lib/analytics';
import { ftueSfx } from '../../lib/sfx-ftue';
import { Button } from '../Button';
import { ONBOARDING_KEY } from '../../lib/ftue';
import { MarcGuide, type MarcState } from './MarcGuide';

type Act = 'tunnel' | 'reversal' | 'promise' | 'quiz' | 'reveal' | 'conquest' | 'epilogue';
const ORDER: Act[] = ['tunnel', 'reversal', 'promise', 'quiz', 'reveal', 'conquest', 'epilogue'];
// durées de respiration (hybride) ; quiz & epilogue attendent une interaction
const AUTO: Partial<Record<Act, number>> = { tunnel: 4600, reversal: 2600, promise: 4200, reveal: 5200, conquest: 3400 };
// noms réels de stations qui défilent dans le tunnel (l'avant, le quotidien)
const TUNNEL_NAMES = ['Bastille', 'Concorde', 'Nation', 'Louvre — Rivoli', 'Châtelet', 'Étoile'];

export function Emergence({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const { t } = useI18n();
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const beat = (ms: number) => (reduced ? Math.min(ms, 800) : ms);

  const [act, setAct] = useState<Act>('tunnel');
  const [marc, setMarc] = useState<MarcState>('entree');
  const [speaking, setSpeaking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms); timers.current.push(id); return id;
  }, []);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);
  useEffect(() => { track('ftue_emergence_start'); }, []);

  const mark = () => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ } };
  const skip = () => { hapticTap(); track('ftue_skip', { act }); mark(); onDone(); };
  const finish = () => { hapticTap(); track('ftue_done'); mark(); (onStart ?? onDone)(); };
  const go = (a: Act) => setAct(a);
  const next = () => { const i = ORDER.indexOf(act); if (i < ORDER.length - 1) go(ORDER[i + 1]); };

  // ── orchestration par temps : Marc + son + auto-advance (hybride) ──
  useEffect(() => {
    clearTimers();
    switch (act) {
      case 'tunnel':
        setMarc('entree'); ftueSfx.rumble(reduced ? 1 : 3.4);
        after(beat(1100), () => setMarc('salut'));
        break;
      case 'reversal':
        setMarc('pointe'); ftueSfx.whoosh(); haptic([20, 40, 30]);
        break;
      case 'promise':
        setMarc('pointe'); after(beat(1400), () => setMarc('idle'));
        break;
      case 'quiz':
        setMarc('pointe'); after(beat(800), () => setMarc('idle'));
        break;
      case 'reveal':
        setMarc('pointe');
        break;
      case 'conquest':
        setMarc('celebre'); ftueSfx.sparkle(); haptic([40, 60, 90]);
        break;
      case 'epilogue':
        setMarc('idle'); after(beat(600), () => setMarc('salut'));
        break;
    }
    const d = AUTO[act];
    if (d) after(beat(d), next);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  // tap n'importe où : débloque l'audio + précipite le temps suivant (sauf actes interactifs)
  function onStageTap() {
    ftueSfx.unlock();
    if (act === 'quiz' || act === 'epilogue') return;
    hapticTap(); next();
  }

  function answer(choice: string, correct: boolean) {
    if (picked) return;
    ftueSfx.unlock(); hapticTap();
    setPicked(choice);
    setMarc(correct ? 'acquiesce' : 'reconforte');
    haptic(correct ? [30] : [55, 40, 55]);
    after(beat(1200), () => { go('reveal'); ftueSfx.chime(); setSpeaking(true); after(beat(2600), () => setSpeaking(false)); });
  }

  function toggleMute() { const m = !muted; setMuted(m); ftueSfx.setMuted(m); }

  const dark = act === 'tunnel' || act === 'reversal';
  const L = (k: string, p?: Record<string, string | number>) => t(k as Parameters<typeof t>[0], p);

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md select-none flex-col overflow-hidden"
      style={{ background: dark ? 'var(--color-acier)' : 'var(--color-craie)', transition: 'background 1s ease', color: dark ? 'var(--color-craie)' : 'var(--color-pierre)' }}
      onPointerDown={onStageTap}
    >
      {/* ── ATMOSPHÈRE (god-rays clairs / vignette / grain) ── */}
      {!dark && !reduced && (
        <div className="ftue-godray pointer-events-none absolute inset-x-0 top-0 z-0 h-2/3"
          style={{ background: 'conic-gradient(from 180deg at 60% -10%, transparent 0deg, rgba(227,196,99,0.22) 18deg, transparent 36deg, rgba(227,196,99,0.16) 60deg, transparent 84deg)', filter: 'blur(2px)' }} />
      )}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.28)' }} />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.6px)', backgroundSize: '3px 3px' }} />

      {/* LE RENVERSEMENT : voile clair qui envahit depuis le phare (tenu ~1.8s) */}
      {act === 'reversal' && (
        <div className="ftue-flood-slow pointer-events-none absolute inset-0 z-[1]" style={{ background: 'radial-gradient(120% 100% at 62% 42%, #fffdf7 0%, var(--color-craie) 55%, #efe6d2 100%)' }} />
      )}

      {/* ── BARRE HAUTE : son · passer ── */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleMute()} aria-label="son"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm active:scale-95"
          style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: dark ? 'rgba(244,238,218,0.75)' : 'var(--color-pierre-faint)' }}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => skip()}
          className="rounded-full px-3.5 py-1.5 font-mono text-xs backdrop-blur active:scale-95"
          style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(244,238,218,0.7)' : 'var(--color-pierre-faint)' }}>
          {L('ftue.skip')} ›
        </button>
      </div>

      {/* ════ SCÈNE ════ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-7 text-center">

        {/* ACTE 0 — LE TUNNEL (le quotidien, tête baissée) */}
        {act === 'tunnel' && (
          <div className="ftue-fade flex flex-col items-center">
            {/* plaques de station qui défilent et s'éteignent (les noms du quotidien) */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              {TUNNEL_NAMES.map((n, i) => (
                <span key={n} className="ftue-plate-drift absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em]"
                  style={{ top: `${18 + i * 13}%`, color: 'rgba(143,201,185,0.45)', border: '1px solid rgba(143,201,185,0.25)', animationDelay: `${i * 0.55}s` }}>
                  {n}
                </span>
              ))}
            </div>
            {/* phare jaune qui grandit dans le noir */}
            <div className="ftue-headlight relative mb-5 h-24 w-24 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(242,194,0,0.85) 0%, rgba(242,194,0,0) 70%)' }} />
            <p className="font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: 'var(--color-ambre)' }}>{L('ftue.tunnelKicker')}</p>
            <h1 className="ftue-brand mt-2 text-[clamp(2rem,9vw,3.1rem)] font-bold uppercase leading-[0.95]"
              style={{ fontFamily: 'var(--font-brand)', color: 'var(--color-craie)' }}>
              Arcadia<br /><span style={{ color: 'var(--color-laiton-clair)' }}>SubLine</span>
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'rgba(244,238,218,0.62)' }}>{L('ftue.tunnelSub')}</p>
          </div>
        )}

        {/* ACTE 1 — LE RENVERSEMENT (le money shot : Paris se déplie) */}
        {act === 'reversal' && (
          <div className="relative z-[2] flex w-full flex-col items-center">
            <svg viewBox="0 0 320 150" className="w-full max-w-sm" aria-hidden>
              {/* la ligne se trace + stations qui éclosent comme des lampes */}
              <path d="M 20 110 C 80 60, 150 130, 220 70 S 300 50, 300 60" fill="none"
                stroke="var(--color-laiton)" strokeWidth="3.5" strokeLinecap="round"
                pathLength={1} className="ftue-line-draw" style={{ filter: 'drop-shadow(0 0 6px rgba(201,162,39,0.5))' }} />
              {[[60,84],[120,98],[180,86],[240,64],[300,60]].map(([x,y],i)=>(
                <circle key={i} className="ftue-bloom" cx={x} cy={y} r="6" fill="#0a5a9e" stroke="#fff" strokeWidth="2"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${0.5 + i * 0.18}s` }} />
              ))}
            </svg>
            <p className="ftue-rise mt-4 font-display text-2xl font-extrabold" style={{ color: 'var(--color-pierre)', animationDelay: '1s' }}>
              {L('ftue.reversal')}
            </p>
          </div>
        )}

        {/* ACTE 2 — LA PROMESSE (touche une station, d'où tu veux) */}
        {act === 'promise' && (
          <div className="ftue-fade flex flex-col items-center">
            {/* une station qui s'allume sous un doigt (géoloc tranchée par l'image) */}
            <div className="relative mb-5 h-24 w-24">
              <span className="ftue-bloom absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(10,90,158,0.25), transparent 70%)' }} />
              <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#0a5a9e', boxShadow: '0 0 0 4px rgba(255,255,255,0.9), 0 0 22px rgba(10,90,158,0.6)' }} />
              <span className="absolute left-[58%] top-[58%] text-3xl">👆</span>
            </div>
            <p className="ftue-rise max-w-xs text-[15px] font-semibold leading-relaxed" style={{ color: 'var(--color-pierre)' }}>{L('ftue.emergence')}</p>
          </div>
        )}

        {/* ACTE 3 — LE QUIZ (micro-aha, local, zéro serveur) */}
        {act === 'quiz' && (
          <div className="ftue-fade w-full">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-pierre-faint">{L('ftue.qHint')}</p>
            <h2 className="mx-auto mt-2 max-w-sm font-display text-[clamp(1.3rem,5.5vw,1.9rem)] font-extrabold leading-tight text-pierre">{L('ftue.q')}</h2>
          </div>
        )}

        {/* ACTE 4 — LE REVEAL (le loot : l'archive culturelle s'ouvre) */}
        {act === 'reveal' && (
          <div className="ftue-fade w-full">
            <div className="ftue-bloom mx-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left"
              style={{ borderColor: 'rgba(63,107,77,0.5)', background: 'rgba(63,107,77,0.08)' }}>
              <span className="animate-glow flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 text-xl" style={{ borderColor: 'var(--color-guimard)', color: 'var(--color-guimard)' }}>⚜</span>
              <span className="flex-1">
                <span className="block font-display text-sm font-bold" style={{ color: 'var(--color-guimard)' }}>{L('ftue.archive')}</span>
                <span className="block font-mono text-[10px] text-pierre-faint">{L('ftue.archiveNum')}</span>
              </span>
            </div>
            <p className="ftue-rise mx-auto mt-5 max-w-sm font-display text-[clamp(1.2rem,5vw,1.6rem)] font-extrabold italic leading-snug text-pierre" style={{ animationDelay: '0.2s' }}>
              « {L('ftue.reveal')} »
            </p>
          </div>
        )}

        {/* ACTE 5 — LA CONQUÊTE (tricolore SACRÉ, ici seulement) */}
        {act === 'conquest' && (
          <div className="ftue-fade flex flex-col items-center">
            {!reduced && (
              <div className="pointer-events-none absolute inset-0 z-0 flex justify-center gap-2 overflow-hidden">
                {['#0a5a9e', '#ffffff', '#bb2e2a'].map((c, i) => (
                  <span key={c} className="ftue-tricolore mt-[-20%] h-[140%] w-7 rounded-full" style={{ background: c, opacity: 0.85, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center">
              <span className="ftue-bloom inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: 'var(--color-laiton-clair)', boxShadow: '0 8px 24px rgba(242,194,0,0.45)' }}>★</span>
              <h2 className="ftue-rise mt-4 font-display text-3xl font-extrabold text-pierre">{L('ftue.conquest')}</h2>
              <p className="mt-1 text-sm text-pierre-dim">{L('ftue.conquestSub')}</p>
            </div>
          </div>
        )}

        {/* ACTE 6 — ÉPILOGUE (guest-first) */}
        {act === 'epilogue' && (
          <div className="ftue-fade flex flex-col items-center">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-pierre">{L('ftue.epilogue')}</h2>
            <p className="mt-2 text-sm text-pierre-dim">{L('ftue.epilogueSub')}</p>
          </div>
        )}
      </div>

      {/* ════ MARC (il guide, toujours présent) ════ */}
      <div className="relative z-10 flex flex-none items-end justify-center" style={{ height: 168 }}>
        <MarcGuide state={marc} speaking={speaking} size={158} />
      </div>

      {/* ════ ACTION (bas — pouce) ════ */}
      <div className="relative z-20 px-5 pb-[max(env(safe-area-inset-bottom),1.2rem)]">
        {act === 'quiz' && (
          <div className="flex flex-col gap-2.5">
            {([['a', L('ftue.a1'), true], ['b', L('ftue.a2'), false], ['c', L('ftue.a3'), false]] as const).map(([id, label, correct]) => {
              const reveal = picked !== null; const isPicked = picked === id;
              let bg = 'var(--color-plomb)', border = 'var(--color-rail)', fg = 'var(--color-pierre)';
              if (reveal && correct) { bg = 'var(--color-guimard)'; border = 'var(--color-guimard)'; fg = '#fff'; }
              else if (reveal && isPicked && !correct) { bg = 'var(--color-vermillon)'; border = 'var(--color-vermillon)'; fg = '#fff'; }
              else if (reveal) { fg = 'var(--color-pierre-dim)'; }
              return (
                <button key={id} type="button" disabled={reveal}
                  onClick={(e) => { e.stopPropagation(); answer(id, correct); }}
                  className={`rounded-2xl px-4 py-3.5 text-left font-semibold ${reveal ? '' : 'active:scale-[0.98]'}`}
                  style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1.5px ${border}`, opacity: reveal && !correct && !isPicked ? 0.55 : 1 }}>
                  {reveal && correct ? '✓ ' : reveal && isPicked ? '✕ ' : ''}{label}
                </button>
              );
            })}
          </div>
        )}

        {act === 'epilogue' ? (
          <Button variant="gold" size="md" className="animate-glow" onClick={(e) => { e.stopPropagation(); finish(); }}>⚜ {L('ftue.cta')}</Button>
        ) : act !== 'quiz' ? (
          <p className="ftue-breathe text-center font-mono text-[11px]" style={{ color: dark ? 'rgba(244,238,218,0.6)' : 'var(--color-pierre-faint)' }}>
            {L('ftue.continueHint')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * « L'ÉMERGENCE » V3 — séquence-titre d'accueil, registre ÉMERVEILLEMENT
 * CINÉMATIQUE (réf. Sky / Monument Valley). Audit « Epic » appliqué :
 *
 *  · UN SEUL MONDE — la carte de Paris (Ligne 1, Seine, plaques émaillées) naît
 *    au renversement et NE DISPARAÎT PLUS : quiz → reveal → conquête se jouent
 *    DESSUS, caméra tenue (zéro coupe sèche).
 *  · NARRATION = reconquête du TRAJET (le temps mort du métro devient un jeu),
 *    jamais « depuis le canapé » (fidèle au Manifeste / BRAND_BOOK).
 *  · COUTURE finale : l'intro se fond dans la vraie carte (Louvre-Rivoli pulse),
 *    un seul geste évident → on sait où on arrive.
 *
 * Tempo HYBRIDE (chaque temps respire + tap pour précipiter). Sound design en
 * couches (WebAudio). Invariants FTUE : zéro score serveur, portrait, guest-first,
 * tricolore = conquête only, reduced-motion = repli, skippable → carte.
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

// ── Le plateau de Paris (Ligne 1) — viewBox 400×300, Louvre-Rivoli = héros ──
const NODES = [
  { x: 40, y: 150, n: 'La Défense' },
  { x: 108, y: 116, n: 'Étoile', g: '⌂' },
  { x: 182, y: 158, n: 'Concorde' },
  { x: 244, y: 132, n: 'Louvre-Rivoli', g: '▣', hero: true },
  { x: 304, y: 166, n: 'Châtelet', g: '†' },
  { x: 360, y: 146, n: 'Bastille', g: '⚑', boss: true },
];
const LINE_PATH = 'M 40 150 C 78 120, 92 118, 108 116 S 160 158, 182 158 S 226 132, 244 132 S 288 166, 304 166 S 344 146, 360 146';
const TERRITORY_PATH = 'M 40 150 C 78 120, 92 118, 108 116 S 160 158, 182 158 S 226 132, 244 132'; // conquis : ouest → Louvre
const SEINE_PATH = 'M 0 232 C 90 210, 150 250, 220 224 S 330 206, 400 230';
const LOUVRE = NODES.find((n) => n.hero)!;
const CAM: Record<Act, number> = { tunnel: 1, reversal: 1, promise: 1.7, quiz: 1.7, reveal: 1.7, conquest: 1.25, epilogue: 1 };
// Silhouette lointaine de Paris (horizon, profondeur) : toits + Tour Eiffel,
// Arc de Triomphe, dômes (Panthéon / Sacré-Cœur). Muet, derrière la ligne.
const SKYLINE =
  'M 0 96 L 0 78 L 14 78 L 18 70 L 30 70 L 30 84 L 48 84 L 48 72 L 60 72 L 60 84 ' +
  'L 78 84 Q 82 58 86 84 L 104 84 L 104 74 L 120 74 L 120 84 ' + // Arc de Triomphe (bloc)
  'L 150 84 L 156 40 L 162 84 ' + // Tour Eiffel (flèche)
  'L 188 84 L 188 72 L 206 72 L 206 84 L 224 84 ' +
  'Q 240 56 256 84 ' + // dôme (Panthéon)
  'L 280 84 L 280 70 L 296 70 L 296 84 L 320 84 ' +
  'Q 336 60 352 84 ' + // dôme (Sacré-Cœur)
  'L 372 84 L 372 76 L 400 76 L 400 96 Z';

function ParisBoard({ draw, focus, conquered, reduced }: { draw: boolean; focus: boolean; conquered: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf7ec" /><stop offset="1" stopColor="#efe6d2" /></linearGradient>
        <radialGradient id="halo"><stop offset="0" stopColor="#0a5a9e" stopOpacity="0.22" /><stop offset="1" stopColor="#0a5a9e" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky)" />
      {/* horizon : silhouette lointaine de Paris (profondeur, brume) */}
      <path d={SKYLINE} fill="#0a5a9e" opacity="0.07" transform="translate(0 -6)" />
      <path d={SKYLINE} fill="#0a5a9e" opacity="0.1" />
      {/* la Seine */}
      <path d={`${SEINE_PATH} L 400 300 L 0 300 Z`} fill="#0a5a9e" opacity="0.12" />
      <path d={SEINE_PATH} fill="none" stroke="#7db4e0" strokeWidth="1.4" opacity="0.5" />
      {/* tracé de la Ligne 1 (gris chaud) puis dessin animé en laiton */}
      <path d={LINE_PATH} fill="none" stroke="#d8cdb4" strokeWidth="5" strokeLinecap="round" />
      <path d={LINE_PATH} fill="none" stroke="var(--color-laiton)" strokeWidth="5" strokeLinecap="round"
        pathLength={1} className={draw && !reduced ? 'ftue-line-draw' : ''}
        style={{ filter: 'drop-shadow(0 0 5px rgba(201,162,39,0.5))', strokeDashoffset: draw ? undefined : 0, strokeDasharray: draw ? undefined : 'none' }} />
      {/* territoire conquis : ouest → Louvre s'illumine */}
      {conquered && (
        <path d={TERRITORY_PATH} fill="none" stroke="#f2c200" strokeWidth="5.5" strokeLinecap="round"
          pathLength={1} className={reduced ? '' : 'ftue-territory'} style={{ filter: 'drop-shadow(0 0 8px rgba(242,194,0,0.8))' }} />
      )}
      {/* stations = plaques émaillées (le motif signature) */}
      {NODES.map((nd, i) => {
        const isLouvre = nd.hero;
        const tricolore = isLouvre && conquered;
        return (
          <g key={nd.n} className={draw && !reduced ? 'ftue-bloom' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${0.4 + i * 0.14}s` }}>
            {nd.g && <text x={nd.x} y={nd.y - 16} textAnchor="middle" fontSize="13" fill="#9c7d18" opacity="0.85">{nd.g}</text>}
            {isLouvre && focus && <circle cx={nd.x} cy={nd.y} r="26" fill="url(#halo)" className={reduced ? '' : 'animate-map-pulse'} />}
            {/* plaque */}
            <rect x={nd.x - (isLouvre ? 10 : 6)} y={nd.y - (isLouvre ? 7 : 5)} width={isLouvre ? 20 : 12} height={isLouvre ? 14 : 10} rx="2.5"
              fill={tricolore ? '#fff' : '#0a5a9e'} stroke={tricolore ? '#bb2e2a' : '#fff'} strokeWidth={isLouvre ? 2 : 1.4}
              style={isLouvre ? { filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' } : undefined} />
            {tricolore && <rect x={nd.x - 10} y={nd.y - 7} width="6.6" height="14" fill="#0a5a9e" />}
            {tricolore && <rect x={nd.x + 3.4} y={nd.y - 7} width="6.6" height="14" fill="#bb2e2a" />}
          </g>
        );
      })}
    </svg>
  );
}

export function Emergence({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const beat = (ms: number) => (reduced ? Math.min(ms, 800) : ms);
  const L = (k: string, p?: Record<string, string | number>) => t(k as Parameters<typeof t>[0], p);

  const [act, setAct] = useState<Act>('tunnel');
  const [marc, setMarc] = useState<MarcState>('entree');
  const [speaking, setSpeaking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [planted, setPlanted] = useState(false);
  const [muted, setMuted] = useState(false);
  // affordance « Entrer » : escalade si le joueur reste dans le noir > 2,5 s (anti-blocage)
  const [hint, setHint] = useState(false);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => { const id = window.setTimeout(fn, ms); timers.current.push(id); return id; }, []);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { clearTimers(); ftueSfx.ambientStop(); }, []);
  useEffect(() => { track('ftue_emergence_start'); }, []);

  // Débloque l'audio ET lance la nappe ambiante (idempotent) au 1er geste.
  const wakeAudio = () => { ftueSfx.unlock(); ftueSfx.ambientStart(); };

  const mark = () => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ } };
  const skip = () => { hapticTap(); track('ftue_skip', { act }); ftueSfx.ambientStop(); mark(); onDone(); };
  const finish = () => { hapticTap(); track('ftue_done'); ftueSfx.ambientStop(); mark(); (onStart ?? onDone)(); };
  const go = (a: Act) => setAct(a);
  const next = () => { const i = ORDER.indexOf(act); if (i < ORDER.length - 1) go(ORDER[i + 1]); };

  // 100 % AU TOUCHÉ : aucun temps n'avance seul — le joueur cause chaque étape.
  useEffect(() => {
    clearTimers();
    setHint(false);
    switch (act) {
      case 'tunnel':
        setMarc('entree'); ftueSfx.rumble(reduced ? 1 : 3.4);
        after(beat(1100), () => setMarc('salut'));
        // FALLBACK anti-blocage : si pas de tap après 2,5 s, l'invite « Entrer » s'intensifie
        after(2500, () => setHint(true));
        break;
      case 'reversal': setMarc('pointe'); ftueSfx.whoosh(); haptic([20, 40, 30]); break;
      case 'promise': setMarc('pointe'); after(beat(1400), () => setMarc('idle')); break;
      case 'quiz': setMarc('pointe'); after(beat(800), () => setMarc('idle')); break;
      case 'reveal': setMarc('pointe'); break;
      case 'conquest': setMarc('idle'); setPlanted(false); break;
      case 'epilogue': setMarc('idle'); after(beat(600), () => setMarc('salut')); break;
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  function plantFlag() {
    if (planted) return;
    hapticTap(); setPlanted(true); ftueSfx.sparkle(); haptic([40, 60, 90]); setMarc('celebre');
  }

  // un toucher = une étape. Quiz/épilogue : cibles dédiées. Conquête : planter puis continuer.
  function onStageTap() {
    wakeAudio();
    if (act === 'quiz' || act === 'epilogue') return;
    if (act === 'conquest') { if (!planted) plantFlag(); else { hapticTap(); next(); } return; }
    hapticTap(); next();
  }

  function answer(choice: string, correct: boolean) {
    if (picked) return;
    wakeAudio(); hapticTap(); setPicked(choice);
    setMarc(correct ? 'acquiesce' : 'reconforte'); haptic(correct ? [30] : [55, 40, 55]);
    after(beat(1200), () => { go('reveal'); ftueSfx.chime(); setSpeaking(true); after(beat(2600), () => setSpeaking(false)); });
  }
  function toggleMute() { const m = !muted; setMuted(m); ftueSfx.setMuted(m); }

  const dark = act === 'tunnel';
  const boardVisible = act !== 'tunnel';
  const focus = act === 'promise' || act === 'quiz' || act === 'reveal' || (act === 'conquest' && !planted);
  const conquered = planted || act === 'epilogue';
  const tapLabel = act === 'tunnel' ? L('ftue.tapEnter')
    : act === 'promise' ? L('ftue.tapStation')
    : act === 'conquest' ? (planted ? L('ftue.continueHint') : L('ftue.tapConquer'))
    : (act === 'reversal' || act === 'reveal') ? L('ftue.continueHint')
    : '';

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md select-none flex-col overflow-hidden"
      style={{ background: dark ? 'var(--color-acier)' : 'var(--color-craie)', transition: 'background 1s ease', color: dark ? 'var(--color-craie)' : 'var(--color-pierre)' }}
      onPointerDown={onStageTap}
    >
      {/* ── LE MONDE PERSISTANT : plateau de Paris + caméra tenue ── */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ opacity: boardVisible ? 1 : 0, transition: 'opacity 1.1s ease' }}>
        <div className="ftue-cam h-full w-full" style={{ transform: `scale(${CAM[act]})`, transformOrigin: `${(LOUVRE.x / 400) * 100}% ${(LOUVRE.y / 300) * 100}%` }}>
          <ParisBoard draw={act === 'reversal'} focus={focus} conquered={conquered} reduced={reduced} />
        </div>
      </div>

      {/* atmosphère */}
      {boardVisible && !reduced && (
        <div className="ftue-godray pointer-events-none absolute inset-x-0 top-0 z-0 h-1/2"
          style={{ background: 'conic-gradient(from 180deg at 60% -10%, transparent 0deg, rgba(227,196,99,0.20) 18deg, transparent 40deg, rgba(227,196,99,0.14) 64deg, transparent 88deg)', filter: 'blur(2px)' }} />
      )}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 170px rgba(0,0,0,0.26)' }} />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.6px)', backgroundSize: '3px 3px' }} />
      {/* voile de lecture : la moitié basse se fond en craie pour la lisibilité du texte */}
      {boardVisible && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[62%]" style={{ background: 'linear-gradient(to bottom, transparent, var(--color-craie) 58%)' }} />}
      {/* LE RENVERSEMENT : la lumière envahit depuis le phare (plan tenu) */}
      {act === 'reversal' && (
        <div className="ftue-flood-slow pointer-events-none absolute inset-0 z-[2]" style={{ background: 'radial-gradient(120% 100% at 61% 44%, #fffdf7 0%, var(--color-craie) 55%, #efe6d2 100%)' }} />
      )}

      {/* ── BARRE HAUTE ── */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2">
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleMute()} aria-label="son"
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm active:scale-95"
            style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: dark ? 'rgba(244,238,218,0.75)' : 'var(--color-pierre-faint)' }}>
            {muted ? '🔇' : '🔊'}
          </button>
          {/* le touriste ne doit JAMAIS être piégé dans une langue : bascule dès l'accueil */}
          <button type="button" onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { hapticTap(); setLocale(locale === 'fr' ? 'en' : 'fr'); }}
            aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
            className="flex h-9 items-center justify-center rounded-full px-3 font-mono text-xs font-bold tracking-wider active:scale-95"
            style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: dark ? 'rgba(244,238,218,0.75)' : 'var(--color-pierre-faint)' }}>
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => skip()}
          className="rounded-full px-3.5 py-1.5 font-mono text-xs backdrop-blur active:scale-95"
          style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(244,238,218,0.7)' : 'var(--color-pierre-faint)' }}>
          {L('ftue.skip')} ›
        </button>
      </div>

      {/* ── BANDE NARRATIVE (bas, lisible sur le voile) ── */}
      <div className="relative z-10 mt-auto flex flex-col items-center px-7 text-center">
        {act === 'tunnel' && (
          <div className="ftue-fade mb-2 flex flex-col items-center">
            {/* phare + rame MP59 stylisée qui percute le wordmark (brand-block AAA) */}
            <svg viewBox="0 0 300 90" className="mb-3 h-16 w-64" aria-hidden>
              <defs><radialGradient id="hl"><stop offset="0" stopColor="#f2c200" stopOpacity="0.9" /><stop offset="1" stopColor="#f2c200" stopOpacity="0" /></radialGradient></defs>
              <circle className="ftue-headlight" cx="232" cy="46" r="46" fill="url(#hl)" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              <g className="ftue-rise">
                <rect x="60" y="30" width="150" height="34" rx="9" fill="#8fc9b9" stroke="#cfe0d9" strokeWidth="2" />
                <rect x="72" y="38" width="26" height="14" rx="3" fill="#0c2230" opacity="0.85" />
                <rect x="108" y="38" width="26" height="14" rx="3" fill="#0c2230" opacity="0.85" />
                <circle cx="204" cy="47" r="5" fill="#f2c200" />
              </g>
            </svg>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: 'var(--color-ambre)' }}>{L('ftue.tunnelKicker')}</p>
            <h1 className="ftue-brand mt-2 text-[clamp(2rem,9vw,3rem)] font-bold uppercase leading-[0.95]" style={{ fontFamily: 'var(--font-brand)', color: 'var(--color-craie)' }}>
              Arcadia <span style={{ color: 'var(--color-laiton-clair)' }}>SubLine</span>
            </h1>
            {/* cartouche émaillé PARIS · LIGNE 1 (signature réseau) */}
            <div className="ftue-fade mt-3 flex items-center gap-2" style={{ animationDelay: '0.5s' }}>
              <span className="inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white"
                style={{ background: '#0a5a9e', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)' }}>Paris</span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                style={{ background: '#f2c200', color: '#1a1a1a', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.6)' }}>1</span>
            </div>
            <p className="mt-3 max-w-xs text-sm" style={{ color: 'rgba(244,238,218,0.62)' }}>{L('ftue.tunnelSub')}</p>
          </div>
        )}

        {act === 'reversal' && (
          <p className="ftue-rise mb-2 font-display text-[clamp(1.6rem,7vw,2.2rem)] font-extrabold" style={{ color: 'var(--color-pierre)', animationDelay: '0.9s' }}>{L('ftue.reversal')}</p>
        )}

        {act === 'promise' && (
          <p className="ftue-rise mb-2 max-w-sm font-display text-[clamp(1.2rem,5.4vw,1.6rem)] font-extrabold leading-tight" style={{ color: 'var(--color-pierre)' }}>{L('ftue.emergence')}</p>
        )}

        {act === 'quiz' && (
          <div className="ftue-fade mb-1 w-full">
            {/* plaque : on joue bien LA station qu'on vient de toucher (cohérence) */}
            <span className="mx-auto inline-block rounded-[4px] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white" style={{ background: '#0a5a9e', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)' }}>Louvre-Rivoli</span>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-pierre-faint">{L('ftue.qHint')}</p>
            <h2 className="mx-auto mt-1 max-w-sm font-display text-[clamp(1.15rem,4.8vw,1.6rem)] font-extrabold leading-tight text-pierre">{L('ftue.q')}</h2>
          </div>
        )}

        {act === 'reveal' && (
          <div className="ftue-fade mb-1 w-full">
            <div className="ftue-open mx-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left" style={{ borderColor: 'rgba(63,107,77,0.5)', background: 'rgba(63,107,77,0.1)' }}>
              <span className="animate-glow flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 text-lg" style={{ borderColor: 'var(--color-guimard)', color: 'var(--color-guimard)' }}>⚜</span>
              <span className="flex-1">
                <span className="block font-display text-sm font-bold" style={{ color: 'var(--color-guimard)' }}>{L('ftue.archive')}</span>
                <span className="block font-mono text-[10px] text-pierre-faint">{L('ftue.archiveNum')}</span>
              </span>
            </div>
            <p className="ftue-rise mx-auto mt-3 max-w-sm font-display text-[clamp(1.1rem,4.6vw,1.5rem)] font-extrabold italic leading-snug text-pierre" style={{ animationDelay: '0.2s' }}>« {L('ftue.reveal')} »</p>
          </div>
        )}

        {act === 'conquest' && (
          <div className="ftue-fade mb-1 flex flex-col items-center">
            {planted && !reduced && (
              <div className="pointer-events-none absolute inset-0 -z-0 flex justify-center gap-2 overflow-hidden">
                {['#0a5a9e', '#ffffff', '#bb2e2a'].map((c, i) => (
                  <span key={c} className="ftue-tricolore mt-[-30%] h-[150%] w-6 rounded-full" style={{ background: c, opacity: 0.8, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            )}
            {planted ? (
              <>
                <h2 className="ftue-rise font-display text-2xl font-extrabold text-pierre">{L('ftue.conquest')}</h2>
                <p className="mt-1 max-w-xs text-sm text-pierre-dim">{L('ftue.conquestSub')}</p>
              </>
            ) : (
              <p className="ftue-rise font-display text-xl font-extrabold text-pierre">{L('ftue.conquestPrompt')}</p>
            )}
          </div>
        )}

        {act === 'epilogue' && (
          <div className="ftue-fade mb-1 flex flex-col items-center">
            <h2 className="font-display text-2xl font-extrabold leading-tight text-pierre">{L('ftue.epilogue')}</h2>
            <p className="mt-1.5 max-w-xs text-sm text-pierre-dim">{L('ftue.epilogueSub')}</p>
          </div>
        )}
      </div>

      {/* ── MARC (il guide) ── */}
      <div className="relative z-10 flex flex-none items-end justify-center" style={{ height: 132 }}>
        {/* key-light chaud : détache Marc du fond, lui donne du volume */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[150px] w-[260px] -translate-x-1/2"
          style={{ background: dark
            ? 'radial-gradient(60% 70% at 50% 80%, rgba(242,194,0,0.22), transparent 70%)'
            : 'radial-gradient(58% 68% at 50% 82%, rgba(227,196,99,0.34), transparent 70%)' }} />
        <MarcGuide state={marc} speaking={speaking} size={126} />
      </div>

      {/* ── ACTION (pouce) ── */}
      <div className="relative z-20 px-5 pb-[max(env(safe-area-inset-bottom),1.1rem)]">
        {act === 'quiz' && (
          <div className="flex flex-col gap-2">
            {([['a', L('ftue.a1'), true], ['b', L('ftue.a2'), false], ['c', L('ftue.a3'), false]] as const).map(([id, label, correct]) => {
              const reveal = picked !== null; const isPicked = picked === id;
              let bg = 'var(--color-plomb)', border = 'var(--color-rail)', fg = 'var(--color-pierre)';
              if (reveal && correct) { bg = 'var(--color-guimard)'; border = 'var(--color-guimard)'; fg = '#fff'; }
              else if (reveal && isPicked && !correct) { bg = 'var(--color-vermillon)'; border = 'var(--color-vermillon)'; fg = '#fff'; }
              else if (reveal) { fg = 'var(--color-pierre-dim)'; }
              return (
                <button key={id} type="button" disabled={reveal} onClick={(e) => { e.stopPropagation(); answer(id, correct); }}
                  className={`rounded-2xl px-4 py-3 text-left font-semibold ${reveal ? '' : 'active:scale-[0.98]'}`}
                  style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1.5px ${border}`, opacity: reveal && !correct && !isPicked ? 0.55 : 1 }}>
                  {reveal && correct ? '✓ ' : reveal && isPicked ? '✕ ' : ''}{label}
                </button>
              );
            })}
          </div>
        )}
        {act === 'epilogue' ? (
          <Button variant="gold" size="md" className="animate-glow" onClick={(e) => { e.stopPropagation(); finish(); }}>⚜ {L('ftue.cta')}</Button>
        ) : act !== 'quiz' && tapLabel ? (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center gap-2 rounded-full font-mono font-semibold uppercase tracking-[0.14em] backdrop-blur transition-all duration-300 ${
                dark
                  ? (hint ? 'animate-glow px-5 py-2.5 text-[13px]' : 'px-4 py-2 text-[12px]')
                  : 'ftue-breathe px-4 py-2 text-[11px]'
              }`}
              style={
                dark
                  // tunnel (fond Acier) : laiton VIF, contraste fort, JAMAIS de creux d'opacité ;
                  // après 2,5 s sans tap (hint), l'invite grossit et s'illumine (anti-blocage).
                  ? { background: hint ? 'rgba(242,194,0,0.30)' : 'rgba(242,194,0,0.18)', color: 'var(--color-laiton-clair)', boxShadow: 'inset 0 0 0 1.5px rgba(227,196,99,0.7)' }
                  : { background: 'rgba(10,90,158,0.1)', color: 'var(--color-email)' }
              }
            >
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'currentColor', boxShadow: '0 0 0 3px rgba(160,160,160,0.18)' }} />
              {tapLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

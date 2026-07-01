/**
 * « L'ÉMERGENCE » — COLD-OPEN CINÉMATIQUE (le film, port de Claude Design).
 *
 * REMPLACE TOTALEMENT l'ancienne cinématique 7-actes. 4 TEMPS. Décision fondateur :
 * l'intro COLLE AU JEU → on embarque les VRAIS composants.
 *   · T0 Émergence  : noir Acier → un tap perce → light-wipe (SVG/CSS).
 *   · T1 Carte      : la VRAIE carte MapLibre (MapView), copie de compréhension + CTA.
 *   · T2 Assaut     : le VRAI jeu Bastille (DemolitionGame / Matter.js), params indulgents
 *                     (non-bloquant) → à la fin, drapeau LIBÉRÉE + flash tradition.
 *   · T3 Carton     : apex « EMPEREUR DE PARIS » (verrouillé, à mériter), balise Gare de Lyon.
 *
 * MANDAT A — art-direction : easings nommés (--ease-emergence/conquest/authority), grain
 * constant, gloss émail-only, apex kinétique. MANDAT B — COMPRÉHENSION : le texte écran
 * SEUL répond Où / Quoi / Pourquoi revenir.
 *
 * ROBUSTESSE : Suspense sur chaque embed lazy ; `IntroBoundary` (AppLayout) rattrape tout
 * crash → dépose sur la carte ; un « passer » est TOUJOURS dispo → personne n'est coincé.
 *
 * Honnêteté : CONQUÊTE décernée (LIBÉRÉE — toujours vrai), JAMAIS un rang faux ; couronne
 * Empereur VERROUILLÉE. Cold-open ancré Bastille par design ; `firstStation` = copy/analytics.
 * Présence = bonus futur, jamais un gate. Invariants FTUE : zéro score serveur (onFinish du
 * jeu N'EST PAS soumis ici), guest-first, skippable, reduced-motion = repli.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { tap as hapticTap, haptic } from '../../lib/feedback';
import { track } from '../../lib/analytics';
import { ftueSfx } from '../../lib/sfx-ftue';
import { ONBOARDING_KEY } from '../../lib/ftue';
import { getGame, type GameContext } from '@arcadia/games';
import { getStationContent, NETWORK } from '../../lib/content';
import { MarcGuide, type MarcState } from './MarcGuide';

type Beat = 'emergence' | 'map' | 'assault' | 'apex';
interface FirstStation { slug: string; name: string }
const DEFAULT_FIRST: FirstStation = { slug: 'bastille', name: 'Bastille' };

const MapView = lazy(() => import('../MapView').then((m) => ({ default: m.MapView })));
const DemolitionGame = lazy(getGame('demolition').load);
const PLAYABLE_CODES = new Set(NETWORK.lines.filter((l) => l.status === 'playable').map((l) => l.code));

// ── Plateau de Paris (T2b : drapeau planté SUR Bastille · T3 : carton-titre) ──
// PORTRAIT-FIRST : viewBox 300×400 « slice » plein-hauteur → sur téléphone, le
// crop horizontal ne mange que les marges ; tout contenu vit dans x ∈ [60, 240]
// (sûr jusqu'aux formats 19,5:9). La ligne vit dans la BANDE HAUTE (y ≤ ~230) :
// le carton-titre du T3 occupe le bas — le sujet (Bastille tricolore, balise
// Gare de Lyon) reste toujours AU-DESSUS du dégradé de lisibilité.
type Soul = 'arch' | 'star' | 'museum' | 'cross' | 'fortress' | 'clock';
interface Node { x: number; y: number; name: string; soul: Soul; label?: boolean; first?: boolean; east?: boolean }
const NODES: Node[] = [
  { x: 66, y: 60, name: 'La Défense', soul: 'arch' },
  { x: 140, y: 74, name: 'Champs-Élysées', soul: 'star' },
  { x: 92, y: 102, name: 'Concorde', soul: 'star' },
  { x: 156, y: 118, name: 'Louvre-Rivoli', soul: 'museum', label: true },
  { x: 88, y: 154, name: 'Châtelet', soul: 'cross' },
  { x: 180, y: 162, name: 'Bastille', soul: 'fortress', label: true, first: true },
  { x: 236, y: 180, name: 'Gare de Lyon', soul: 'clock', east: true },
];
const LINE_PATH =
  'M 66 60 C 92 64, 118 66, 140 74 C 124 84, 106 92, 92 102 C 112 108, 136 112, 156 118 ' +
  'C 132 130, 106 142, 88 154 C 118 158, 152 158, 180 162 C 200 167, 220 172, 236 180';
// caméra du plateau : origine = Bastille (180/300 ; 162/400) — IDENTIQUE aux deux
// cadrages pour que la transition T2b → T3 soit un vrai mouvement de caméra.
const BOARD_ORIGIN = '60% 40.5%';
const BOARD_CLOSEUP = 'translate(-56px, 30px) scale(1.6)';
const BOARD_WIDE = 'translate(0px, 0px) scale(1)';

function SoulIcon({ soul, color }: { soul: Soul; color: string }) {
  const s = { stroke: color, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (soul) {
    case 'fortress': return <g {...s}><path d="M-5 5 V-3 H-3 V-5 H-1 V-3 H1 V-5 H3 V-3 H5 V5 Z" /></g>;
    case 'museum': return <g {...s}><path d="M-5 5 H5 M-4 5 V-1 M0 5 V-1 M4 5 V-1 M-5 -1 L0 -5 L5 -1 Z" /></g>;
    case 'arch': return <g {...s}><path d="M-4 5 V-2 A4 4 0 0 1 4 -2 V5" /></g>;
    case 'star': return <g {...s}><path d="M0 -5 L1.3 -1.3 L5 -1 L2 1.4 L3 5 L0 2.8 L-3 5 L-2 1.4 L-5 -1 L-1.3 -1.3 Z" /></g>;
    case 'cross': return <g {...s}><path d="M0 -5 V5 M-4 0 H4" /></g>;
    case 'clock': return <g {...s}><circle cx="0" cy="0" r="4.5" /><path d="M0 0 V-3 M0 0 L2 1.5" /></g>;
  }
}

function ParisBoard({ hideLabels = false }: { hideLabels?: boolean }) {
  return (
    <svg viewBox="0 0 300 400" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><linearGradient id="emg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf7ec" /><stop offset="1" stopColor="#efe6d2" /></linearGradient></defs>
      <rect width="300" height="400" fill="url(#emg-sky)" />
      {/* la Seine, sous la ligne */}
      <path d="M 0 226 C 60 208, 140 244, 210 222 C 250 208, 280 214, 300 208" fill="none" stroke="#7db4e0" strokeWidth="5" opacity="0.35" strokeLinecap="round" />
      <path d={LINE_PATH} fill="none" stroke="var(--color-laiton)" strokeWidth="5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(201,162,39,0.5))' }} />
      {NODES.map((nd) => {
        const active = !!nd.first; // Bastille conquise = pleine couleur + tricolore
        return (
          <g key={nd.name}>
            <g transform={`translate(${nd.x} ${nd.y - 16})`} opacity={active ? 0.95 : 0.5}><SoulIcon soul={nd.soul} color={active ? '#9c7d18' : '#8a8270'} /></g>
            <rect x={nd.x - (active ? 9 : 5.5)} y={nd.y - (active ? 6.5 : 4)} width={active ? 18 : 11} height={active ? 13 : 8} rx="2.2"
              fill={active ? '#fff' : '#b9b09b'} stroke={active ? '#bb2e2a' : '#fff'} strokeWidth={active ? 1.8 : 1.2}
              style={active ? { filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.32))' } : undefined} />
            {active && <><rect x={nd.x - 9} y={nd.y - 6.5} width="6" height="13" fill="#0a5a9e" /><rect x={nd.x + 3} y={nd.y - 6.5} width="6" height="13" fill="#bb2e2a" /></>}
            {/* gros plan (T2b) : étiquettes éteintes — la plaque tricolore et le
                drapeau planté sont seuls en scène */}
            {!hideLabels && nd.label && (
              nd.first
                ? <text x={nd.x - 14} y={nd.y + 4} textAnchor="end" fontSize="9.5" letterSpacing="0.8" fontFamily="'Work Sans', sans-serif" fontWeight="700" fill="#2a2118" style={{ textShadow: '0 1px 2px rgba(246,241,230,0.9)' }}>{nd.name.toUpperCase()}</text>
                : <text x={nd.x} y={nd.y + 20} textAnchor="middle" fontSize="9.5" letterSpacing="0.8" fontFamily="'Work Sans', sans-serif" fontWeight="700" fill="#2a2118" style={{ textShadow: '0 1px 2px rgba(246,241,230,0.9)' }}>{nd.name.toUpperCase()}</text>
            )}
            {!hideLabels && nd.east && <text x={nd.x - 13} y={nd.y + 3} textAnchor="end" fontSize="8" letterSpacing="0.6" fontFamily="'Work Sans', sans-serif" fontWeight="700" fill="#5d5446">GARE DE LYON</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function Emergence({ onDone, onStart, firstStation = DEFAULT_FIRST }: {
  onDone: () => void; onStart?: () => void; firstStation?: FirstStation;
}) {
  const { t, locale, setLocale } = useI18n();
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const beatMs = (ms: number) => (reduced ? Math.min(ms, 500) : ms);
  const L = (k: string) => t(k as Parameters<typeof t>[0]);

  const [beat, setBeat] = useState<Beat>('emergence');
  const [wiped, setWiped] = useState(false);
  const [hint, setHint] = useState(false);
  const [liberated, setLiberated] = useState(false);
  const [flash, setFlash] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [marc, setMarc] = useState<MarcState>('idle');
  const [muted, setMuted] = useState(false);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => { const id = window.setTimeout(fn, ms); timers.current.push(id); return id; }, []);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { clearTimers(); ftueSfx.ambientStop(); }, []);
  useEffect(() => { track('ftue_emergence_start'); }, []);

  const wakeAudio = () => { ftueSfx.unlock(); ftueSfx.ambientStart(); };
  const mark = () => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ } };
  const skip = () => { hapticTap(); track('ftue_skip', { beat }); ftueSfx.ambientStop(); mark(); onDone(); };
  const finish = () => { hapticTap(); track('ftue_done'); ftueSfx.ambientStop(); mark(); (onStart ?? onDone)(); };

  useEffect(() => {
    clearTimers();
    if (beat === 'emergence') { setHint(false); after(2500, () => setHint(true)); ftueSfx.rumble(reduced ? 1 : 3); }
    if (beat === 'map') setMarc('pointe');
    if (beat === 'assault') setMarc('idle');
    if (beat === 'apex') setMarc('salut');
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // T0 : un tap perce le noir → light-wipe → la VRAIE carte
  function pierce() {
    if (wiped) return;
    wakeAudio(); hapticTap(); ftueSfx.whoosh(); haptic([18, 30, 24]);
    setWiped(true);
    after(beatMs(1100), () => { setBeat('map'); ftueSfx.chime(); });
  }
  function takeBastille() { hapticTap(); haptic(20); track('ftue_take_first', { slug: firstStation.slug }); setBeat('assault'); }

  // T2 : à la fin du VRAI jeu (victoire OU abandon) → conquête décernée (jamais bloquant)
  function onAssaultEnd() {
    if (liberated) return;
    setLiberated(true);
    hapticTap(); ftueSfx.sparkle(); haptic([40, 60, 90]); setMarc('celebre');
    track('ftue_liberated', { slug: firstStation.slug });
    after(beatMs(700), () => setFlash(true));
    after(beatMs(2100), () => setFlash(false));
  }
  function toApex() { hapticTap(); setBeat('apex'); }

  // ctx du VRAI jeu Bastille — params INDULGENTS (non-bloquant en FTUE). onFinish n'est PAS
  // soumis au serveur ici : il sert seulement de signal « assaut terminé » (zéro score serveur).
  const bast = getStationContent(firstStation.slug) ?? getStationContent('bastille');
  const demoCtx: GameContext = {
    questId: bast?.quests.bronze.questId ?? 'ftue-demo',
    stationId: bast?.stationId ?? 'ftue',
    stationSlug: bast?.slug ?? 'bastille',
    stationName: bast?.name ?? firstStation.name,
    difficulty: 'bronze',
    params: { ...(bast?.quests.bronze.params ?? {}), maxShots: 30, targetPct: 0, hpMultiplier: 0.5, timeLimitS: 0, reinforced: false },
    locale, reducedMotion: reduced,
  };

  const dark = beat === 'emergence' && !wiped;
  const loading = (
    <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--color-craie)' }}>
      <span className="font-mono text-xs text-pierre-faint">{L('common.loading')}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md select-none flex-col overflow-hidden"
      style={{ background: dark ? 'var(--color-acier)' : 'var(--color-craie)', transition: 'background 1s var(--ease-emergence)', color: dark ? 'var(--color-craie)' : 'var(--color-pierre)' }}
      onPointerDown={beat === 'emergence' ? pierce : undefined}
    >
      {/* ── T1 : LA VRAIE CARTE MapLibre (pleine page, l'intro colle au jeu).
           chrome=false : aucune commande de carte dans le film. ── */}
      {beat === 'map' && (
        <div className="absolute inset-0 z-0">
          <Suspense fallback={loading}>
            <MapView playableCodes={PLAYABLE_CODES} chrome={false} onStation={(slug) => { if (slug === firstStation.slug || slug === 'bastille') takeBastille(); }} />
          </Suspense>
        </div>
      )}

      {/* ── PLATEAU PERSISTANT (T2b → T3) : la MÊME scène, seule la caméra bouge
           (gros plan Bastille au drapeau → pull-out vers la ligne à l'apex). ── */}
      {((beat === 'assault' && liberated) || beat === 'apex') && (
        <div
          className="board-cam pointer-events-none absolute inset-0 z-0"
          style={{ transform: beat === 'apex' ? BOARD_WIDE : BOARD_CLOSEUP, transformOrigin: BOARD_ORIGIN }}
        >
          <ParisBoard hideLabels={beat !== 'apex'} />
        </div>
      )}

      {/* ── T2 : LE VRAI JEU Bastille (Matter.js), indulgent + non-bloquant ── */}
      {beat === 'assault' && !liberated && (
        <div className="absolute inset-0 z-0">
          <Suspense fallback={loading}>
            <DemolitionGame ctx={demoCtx} onFinish={onAssaultEnd} onQuit={onAssaultEnd} />
          </Suspense>
        </div>
      )}

      {/* grain filmique CONSTANT */}
      <div className="film-grain pointer-events-none absolute inset-0 z-[1] opacity-[0.06]" />

      {/* ── BARRE HAUTE : son · langue · passer (toujours un échappatoire).
           MASQUÉE pendant l'assaut live : le vrai jeu a déjà son HUD + son ✕ + son
           mute (un seul chrome par écran — fini la double-barre en collision) ;
           le filet « continuer › » reste l'échappatoire du temps T2. ── */}
      {!(beat === 'assault' && !liberated) && (
      <div className="relative z-30 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2">
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => { const m = !muted; setMuted(m); ftueSfx.setMuted(m); }} aria-label="son"
            className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-[9px] font-bold tracking-wider active:scale-95"
            style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: dark ? 'rgba(244,238,218,0.75)' : 'var(--color-pierre-faint)' }}>{muted ? 'OFF' : 'SON'}</button>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => { hapticTap(); setLocale(locale === 'fr' ? 'en' : 'fr'); }}
            aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
            className="flex h-9 items-center justify-center rounded-full px-3 font-mono text-xs font-bold tracking-wider active:scale-95"
            style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: dark ? 'rgba(244,238,218,0.75)' : 'var(--color-pierre-faint)' }}>{locale === 'fr' ? 'EN' : 'FR'}</button>
        </div>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={skip}
          className="rounded-full px-3.5 py-1.5 font-mono text-xs backdrop-blur active:scale-95"
          style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(244,238,218,0.7)' : 'var(--color-pierre-faint)' }}>{L('ftue.skip')} ›</button>
      </div>
      )}

      {/* ════════ T0 — ÉMERGENCE ════════ */}
      {beat === 'emergence' && (
        <>
          <div className="relative z-10 mt-auto mb-auto flex flex-col items-center px-7 text-center">
            {/* la marque, une fois, sobrement — l'app dit son nom dans le noir
                (identité : le Châssis Acier EST la marque mère), puis s'efface
                dans la lumière. Invariant international : pas d'i18n ici. */}
            <div className="mb-9 flex flex-col items-center gap-2" style={{ opacity: wiped ? 0 : 1, transition: 'opacity 0.5s var(--ease-emergence)' }}>
              <span className="font-brand text-[13px] font-bold uppercase" style={{ letterSpacing: '0.32em', textIndent: '0.32em', color: 'rgba(244,238,218,0.88)' }}>
                Arcadia SubLine
              </span>
              <span className="plaque-gloss rounded-[3px] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white" style={{ letterSpacing: '0.3em', textIndent: '0.3em', background: 'var(--color-email)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)' }}>
                Paris
              </span>
            </div>
            {!wiped && <div className="animate-map-pulse mb-6 h-3 w-3 rounded-full" style={{ background: '#f2c200', boxShadow: '0 0 30px 12px rgba(242,194,0,0.55)' }} />}
            <svg viewBox="0 0 300 90" className="mb-3 h-16 w-64" aria-hidden style={{ opacity: wiped ? 1 : 0.85, transition: 'opacity 0.6s var(--ease-emergence)' }}>
              <rect x="60" y="30" width="150" height="34" rx="9" fill="#8fc9b9" stroke="#cfe0d9" strokeWidth="2" />
              <rect x="72" y="38" width="26" height="14" rx="3" fill="#0c2230" opacity="0.85" />
              <rect x="108" y="38" width="26" height="14" rx="3" fill="#0c2230" opacity="0.85" />
              <circle cx="204" cy="47" r="5" fill="#f2c200" />
            </svg>
            <h1 className="text-[clamp(1.6rem,8vw,2.6rem)] font-bold uppercase leading-[0.95]" style={{ fontFamily: 'var(--font-brand)', color: wiped ? 'var(--color-pierre)' : 'var(--color-craie)', transition: 'color 0.8s var(--ease-emergence)' }}>{L('ftue.t0LookUp')}</h1>
          </div>
          <div className="pointer-events-none absolute inset-0 z-[2]" style={{ background: 'radial-gradient(120% 100% at 62% 42%, #fffdf7 0%, var(--color-craie) 52%, #efe6d2 100%)', opacity: wiped ? 1 : 0, transition: 'opacity 1.1s var(--ease-emergence)' }} />
          {!wiped && (
            <div className="relative z-20 flex justify-center px-5 pb-[max(env(safe-area-inset-bottom),1.4rem)]">
              <span className={`inline-flex items-center gap-2 rounded-full font-mono font-semibold uppercase tracking-[0.14em] backdrop-blur transition-all duration-300 ${hint ? 'animate-glow px-5 py-2.5 text-[13px]' : 'px-4 py-2 text-[12px]'}`}
                style={{ background: hint ? 'rgba(242,194,0,0.30)' : 'rgba(242,194,0,0.18)', color: 'var(--color-laiton-clair)', boxShadow: 'inset 0 0 0 1.5px rgba(227,196,99,0.7)' }}>
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'currentColor' }} />{L('ftue.t0Tap')}
              </span>
            </div>
          )}
        </>
      )}

      {/* ════════ T1 — CARTE VIVANTE : compréhension (Où + Quoi) par-dessus la vraie carte ════════ */}
      {beat === 'map' && (
        <>
          <div className="pointer-events-none relative z-10 mt-auto flex flex-col items-center px-7 pb-2 text-center">
            <span className="rounded-xl px-4 py-2 font-display text-[clamp(1rem,4.6vw,1.35rem)] font-extrabold leading-tight text-pierre" style={{ background: 'rgba(246,241,230,0.82)', backdropFilter: 'blur(2px)' }}>
              {L('ftue.t1Orient')}
            </span>
          </div>
          <div className="relative z-10 flex flex-none items-end justify-center" style={{ height: 96 }}>
            <MarcGuide state={marc} size={104} />
          </div>
          <div className="relative z-20 px-5 pb-[max(env(safe-area-inset-bottom),1.1rem)]">
            <button type="button" onClick={takeBastille}
              className="w-full rounded-2xl py-4 font-display text-lg font-extrabold text-white active:translate-y-[3px]"
              style={{ background: 'var(--color-email)', boxShadow: '0 5px 0 #073f6e, 0 8px 18px rgba(10,90,158,0.35)' }}>
              {L('ftue.t1Cta')}
            </button>
          </div>
        </>
      )}

      {/* T2 : filet « passer l'assaut » → jamais coincé (le vrai jeu a aussi son ✕) */}
      {beat === 'assault' && !liberated && (
        <div className="absolute bottom-3 right-3 z-30">
          <button type="button" onClick={onAssaultEnd}
            className="rounded-full px-3.5 py-1.5 font-mono text-[11px] backdrop-blur active:scale-95"
            style={{ background: 'rgba(15,11,7,0.6)', color: '#cdbfa0' }}>{L('ftue.t2Continue')} ›</button>
        </div>
      )}

      {/* ════════ T2b — DRAPEAU LIBÉRÉE planté SUR Bastille (plateau derrière) ════════ */}
      {beat === 'assault' && liberated && (
        <div
          className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 text-center"
          style={{ opacity: flash ? 0 : 1, transition: 'opacity 0.35s var(--ease-emergence)' }}
        >
          {/* voile de lisibilité : le texte reste net sur le plateau zoomé */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 46% at 50% 46%, rgba(246,241,230,0.85) 0%, rgba(246,241,230,0.45) 60%, transparent 100%)' }} />
          <div className="flag-plant relative">
            <div className="plaque-gloss rounded-[3px] px-4 py-2 text-center" style={{ background: '#0a5a9e', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85), 0 4px 10px rgba(0,0,0,0.3)' }}>
              <span className="font-display text-sm font-extrabold tracking-wide text-white">{L('ftue.t2Liberated')}</span>
            </div>
            <div className="mx-auto h-12 w-1" style={{ background: 'linear-gradient(#c9a227,#86680f)' }} />
          </div>
          <p className="ftue-rise relative mt-6 text-sm font-semibold text-pierre-dim" style={{ animationDelay: '0.2s' }}>{L('ftue.t2Countable')}</p>
          <button type="button" onClick={() => setArchiveOpen(true)} className="relative mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-guimard underline-offset-2 active:underline">{L('ftue.t2ArchiveCta')} ›</button>
          <button type="button" onClick={toApex} className="relative mt-4 rounded-full px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ background: 'rgba(10,90,158,0.12)', color: 'var(--color-email)' }}>{L('ftue.t2Continue')} ›</button>

          {archiveOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-8" onPointerDown={() => setArchiveOpen(false)}>
              <div className="max-w-xs rounded-2xl border-2 p-5 text-center" style={{ background: 'var(--color-plomb)', borderColor: 'var(--color-guimard)' }}><p className="text-sm text-pierre-dim">{L('ftue.t2Archive')}</p></div>
            </div>
          )}
        </div>
      )}

      {/* Flash tradition — PLEIN CADRE (au-dessus de tout, barre comprise) : le
          film coupe au noir Acier, la citation seule à l'écran, puis rend la main. */}
      {flash && (
        <div className="ftue-fade pointer-events-none absolute inset-0 z-[45] flex flex-col items-center justify-center px-8 text-center" style={{ background: 'rgba(17,17,21,0.94)' }}>
          <p className="font-display text-lg font-bold italic text-craie">« {L('ftue.t2FlashQ')} »</p>
          <p className="mt-2 font-display text-xl font-extrabold italic" style={{ color: 'var(--color-laiton-clair)' }}>« {L('ftue.t2FlashA')} »</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--color-ambre)' }}>{L('ftue.t2FlashTag')}</p>
        </div>
      )}

      {/* ════════ T3 — CARTON-TITRE (Pourquoi revenir) sur le plateau (Bastille conquise) ════════ */}
      {beat === 'apex' && (
        <>
          {/* le plateau est déjà là (couche persistante) — seul le dégradé de
              lisibilité du carton s'ajoute */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[62%]" style={{ background: 'linear-gradient(to bottom, transparent, var(--color-craie) 58%)' }} />
          <div className="relative z-10 mt-auto flex flex-col items-center px-7 pb-2 text-center">
            <div className="crown-radiate relative mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'radial-gradient(circle at 40% 30%, #fbe9a6, #c9a227 60%, #86680f)' }}>
              <svg viewBox="0 0 24 16" width="28" aria-hidden><path d="M2 14 L3.5 5 L8 10 L12 3 L16 10 L20.5 5 L22 14 Z" fill="#15110c" /></svg>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--color-acier)' }}>
                <svg viewBox="0 0 16 16" width="9" aria-hidden><path d="M4.5 7 V5 a3.5 3.5 0 0 1 7 0 V7" fill="none" stroke="#e3c463" strokeWidth="1.6" /><rect x="3.5" y="7" width="9" height="6" rx="1.2" fill="#e3c463" /></svg>
              </span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pierre-faint">{L('ftue.t3Scale')}</p>
            <h1 className="mt-1 font-display text-[clamp(1.5rem,7vw,2.3rem)] font-extrabold leading-none tracking-tight text-pierre">
              {L('ftue.t3Apex').split('').map((ch, i) => (<span key={i} className="apex-letter" style={{ animationDelay: `${0.15 + i * 0.045}s` }}>{ch === ' ' ? ' ' : ch}</span>))}
            </h1>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--color-laiton)' }}>{L('ftue.t3Locked')}</span>
            <div className="mt-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-ambre)' }}>
                <span className="flame-flicker inline-block h-3 w-2 rounded-full" style={{ background: 'radial-gradient(circle at 50% 70%, #ffd27a, #e0964a)' }} />{L('ftue.t3Flame')}
              </span>
              <span className="h-3 w-px bg-rail" />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(187,46,42,0.6)' }}>● rival</span>
            </div>
            {/* CTA sur deux étages (jamais de retour à la ligne sauvage) :
                le verbe en héros, la destination en cartouche dessous */}
            <button type="button" onClick={finish}
              className="mt-5 flex w-full max-w-xs flex-col items-center gap-0.5 rounded-2xl px-6 py-3.5 font-display active:translate-y-[2px]"
              style={{ background: 'var(--color-email)', boxShadow: '0 5px 0 #073f6e, 0 8px 18px rgba(10,90,158,0.35)' }}>
              <span className="text-lg font-extrabold leading-tight text-white">{L('ftue.t3Go')}</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-laiton-clair">{L('ftue.t3NextLabel')} · Gare de Lyon ›</span>
            </button>
          </div>
          {/* Marc entier dans le cadre (zone sûre bas d'écran comprise) */}
          <div className="relative z-10 flex flex-none items-end justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]" style={{ height: 96 }}>
            <MarcGuide state={marc} size={80} />
          </div>
        </>
      )}
    </div>
  );
}

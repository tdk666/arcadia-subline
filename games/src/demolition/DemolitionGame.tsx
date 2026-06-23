/**
 * Archétype DÉMOLITION — habillage « Prise de la Bastille ».
 * Composant conforme au contrat GameProps : monte le moteur physique + SFX,
 * affiche le HUD (DA Paris Souterrain), remonte la télémétrie brute via onFinish.
 * La LOGIQUE de jeu et le contrat de télémétrie sont inchangés (passe visuelle).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../contract';
import { DemolitionEngine, type HudState } from './engine';
import { DemolitionSfx } from './audio';
import { bastilleLevel } from './levels/bastille';
import type { DemolitionParams } from './types';

const DEFAULTS: DemolitionParams = {
  maxShots: 5,
  hpMultiplier: 1,
  targetPct: 0,
  timeLimitS: 0,
  reinforced: false,
};

const TIER_LABEL = { bronze: 'BRONZE', silver: 'ARGENT', gold: 'OR' } as const;

/* ── Icônes DA (SVG, zéro asset) ────────────────────────────────────── */

function PaveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <defs>
        <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe6cd" />
          <stop offset="0.6" stopColor="#cdbf9b" />
          <stop offset="1" stopColor="#9d916f" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="url(#pv)" />
      <path d="M1.5 8 H14.5 M8 1.5 V14.5" stroke="rgba(21,17,12,0.28)" strokeWidth="1" />
      <rect x="1.5" y="1.5" width="13" height="2" rx="1.5" fill="rgba(224,150,74,0.5)" />
    </svg>
  );
}

function StandardIcon({ down = false, size = 16 }: { down?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden style={{ opacity: down ? 0.28 : 1 }}>
      <rect x="3" y="1" width="1.5" height="14" fill="#2b2114" />
      <path d="M4.5 2 H14 L11 5 L14 8 H4.5 Z" fill={down ? '#5a4a40' : '#bb2e2a'} />
      {!down && <circle cx="8" cy="5" r="1.4" fill="#e3c463" />}
    </svg>
  );
}

export default function DemolitionGame({ ctx, onFinish, onQuit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [muted, setMuted] = useState(false);
  // ouverture cinématique : « 14 juillet 1789 » s'imprime, la foule gronde, les
  // torches montent — avant que la main rende le contrôle (sautée en reduced-motion).
  const [intro, setIntro] = useState(!ctx.reducedMotion);
  const startRef = useRef(0);
  const sfx = useMemo(() => new DemolitionSfx(), []);

  useEffect(() => {
    if (!intro) return;
    const id = setTimeout(() => setIntro(false), 2500);
    return () => clearTimeout(id);
  }, [intro]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const params: DemolitionParams = { ...DEFAULTS, ...(ctx.params as Partial<DemolitionParams>) };
    startRef.current = performance.now();
    const engine = new DemolitionEngine({
      canvas,
      level: bastilleLevel, // futur : résolu par stationSlug quand d'autres skins existeront
      params,
      tier: ctx.difficulty,
      reducedMotion: ctx.reducedMotion,
      lang: ctx.locale.startsWith('en') ? 'en' : 'fr',
      sfx,
      haptic: (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* non supporté */ } },
      onHud: setHud,
      onEnd: (o) => {
        onFinish({
          completed: true,
          clientWin: o.win,
          durationMs: Math.round(performance.now() - startRef.current),
          answers: {
            tier: ctx.difficulty,
            shots_used: o.shotsUsed,
            max_shots: params.maxShots,
            blocks_destroyed: o.blocksDestroyed,
            total_blocks: o.totalBlocks,
            destruction_pct: o.destructionPct,
            targets_down: o.targetsDown,
            total_targets: o.totalTargets,
            time_left_ms: o.timeLeftMs,
          },
        });
      },
    });
    engine.start();
    return () => { engine.destroy(); sfx.dispose(); };
    // le moteur vit exactement aussi longtemps que l'écran de jeu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.questId]);

  // l'AudioContext ne peut naître que d'un geste utilisateur
  function unlockAudio() {
    sfx.unlock();
    sfx.setMuted(muted);
  }

  const urgent = hud?.timeLeftS != null && (hud.timeLeftS ?? 99) <= 10;
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
  const maxShots = Number((ctx.params as Record<string, number>).maxShots ?? 5);
  const targetPct = Number((ctx.params as Record<string, number>).targetPct ?? 0);
  const targetReached = targetPct > 0 && (hud?.destructionPct ?? 0) >= targetPct;

  return (
    <div
      className="relative h-full w-full touch-none select-none"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}
      onPointerDown={unlockAudio}
    >
      <canvas ref={canvasRef} className="h-full w-full touch-none" style={{ touchAction: 'none' }} />

      {/* ── OUVERTURE CINÉMATIQUE (bloque le tir le temps de poser l'enjeu) ── */}
      {intro && (
        <button
          type="button"
          onClick={() => setIntro(false)}
          className="animate-intro-cine absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
          aria-label={ctx.locale.startsWith('en') ? 'Skip intro' : "Passer l'intro"}
        >
          {/* voile sombre + lueur d'incendie qui monte du faubourg */}
          <span className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 120%, rgba(224,150,74,0.42) 0%, rgba(21,17,12,0.72) 46%, rgba(10,8,5,0.92) 100%)' }} />
          <span className="relative px-8 text-center">
            <span className="block font-mono text-[11px] uppercase tracking-[0.4em]" style={{ color: '#e0964a' }}>
              {ctx.locale.startsWith('en') ? 'The people march on' : 'Le peuple marche sur'}
            </span>
            <span className="animate-stamp mt-2 block font-display text-[clamp(2rem,9vw,4rem)] font-extrabold leading-none tracking-tight text-[#f4eeda]"
              style={{ textShadow: '0 2px 24px rgba(224,150,74,0.5)' }}>
              14 JUILLET 1789
            </span>
            <span className="animate-slide-up mt-3 block font-display text-xl font-bold tracking-[0.3em] uppercase" style={{ color: '#e3c463', animationDelay: '0.3s' }}>
              {ctx.stationName}
            </span>
          </span>
          <span className="absolute bottom-5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#cdbfa0]">
            {ctx.locale.startsWith('en') ? 'tap to begin' : 'touche pour commencer'}
          </span>
        </button>
      )}

      {/* overlay debug (?debug=1) — diagnostic input à distance */}
      {debug && hud && (
        <div className="pointer-events-none absolute left-1/2 top-12 z-50 -translate-x-1/2 rounded bg-black/80 px-3 py-2 text-center font-mono text-[11px] leading-tight text-lime-300">
          downs:{hud.dbg.downs} drag:{String(hud.dbg.dragging)} armed:{String(hud.dbg.armed)}<br />
          frac:{hud.dbg.frac} ballY:{hud.dbg.ballY} flight:{String(hud.dbg.inFlight)}<br />
          phase:{hud.phase} interacted:{String(hud.interacted)}
        </div>
      )}

      {/* ── PLAQUE ÉMAILLÉE (nom de station + palier) ── */}
      <div
        className="pointer-events-none absolute left-3 top-[max(env(safe-area-inset-top),0.6rem)] rounded-[5px] px-4 py-1.5"
        style={{
          background: '#0a5a9e',
          boxShadow: 'inset 0 0 0 2.5px rgba(255,255,255,0.9), inset 0 0 0 4px #0a5a9e, 0 5px 14px rgba(0,0,0,0.45)',
        }}
      >
        {[
          { l: '6px', t: '6px' }, { r: '6px', t: '6px' },
          { l: '6px', b: '6px' }, { r: '6px', b: '6px' },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute h-[5px] w-[5px] rounded-full"
            style={{ left: p.l, right: p.r, top: p.t, bottom: p.b, background: '#cfe0ee', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }}
          />
        ))}
        <div className="text-[15px] font-extrabold uppercase leading-none tracking-[0.14em] text-white">
          {ctx.stationName}
        </div>
        <div className="mt-1 text-[8px] font-semibold uppercase leading-none tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.78)' }}>
          Palier {TIER_LABEL[ctx.difficulty]} · Arcadia SubLine
        </div>
      </div>

      {hud && (
        <>
          {/* ── Cluster d'indicateurs (droite) ── */}
          <div className="pointer-events-none absolute right-3 top-[max(env(safe-area-inset-top),0.6rem)] flex items-center gap-2">
            {/* pavés restants : rangée qui se vide (lecture instantanée façon Angry Birds) */}
            <div
              className="flex items-center gap-1 rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}
            >
              {Array.from({ length: maxShots }).map((_, i) => (
                <span key={i} style={{ opacity: i < Math.max(hud.shotsLeft, 0) ? 1 : 0.22, transition: 'opacity 0.25s' }}>
                  <PaveIcon size={15} />
                </span>
              ))}
            </div>
            {/* étendards */}
            <div
              className="flex items-center gap-0.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}
            >
              {Array.from({ length: hud.totalTargets }).map((_, i) => (
                <StandardIcon key={i} down={i < hud.targetsDown} size={15} />
              ))}
            </div>
            {/* chrono (palier Or) */}
            {hud.timeLeftS !== null && (
              <div
                className="rounded-lg px-3 py-1.5 text-[15px] font-extrabold leading-none"
                style={
                  urgent
                    ? { background: 'rgba(187,46,42,0.85)', color: '#fff', boxShadow: 'inset 0 0 0 1.5px #e3c463' }
                    : { background: 'rgba(15,11,7,0.74)', color: '#e3c463', boxShadow: 'inset 0 0 0 1.5px #3f6b4d' }
                }
              >
                {hud.timeLeftS}s
              </div>
            )}
          </div>

          {/* ── DESTRUCTION % — grand chiffre live, AU CENTRE en haut : impossible à rater
               (retour fondateur : « on ne voit pas où on en est »). ── */}
          <div className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),0.5rem)] z-30 w-[min(70vw,280px)] -translate-x-1/2 text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span
                className="font-display font-extrabold leading-none tabular-nums"
                style={{ fontSize: 'clamp(1.7rem,8vw,2.5rem)', color: targetReached ? '#9ff0b4' : '#f4eeda', textShadow: '0 2px 12px rgba(0,0,0,0.95)' }}
              >
                {hud.destructionPct}%
              </span>
              {targetPct > 0 && (
                <span className="font-display text-base font-bold" style={{ color: targetReached ? '#9ff0b4' : '#e3c463', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  / {targetPct}%
                </span>
              )}
            </div>
            <div
              className="relative mx-auto mt-1 h-2.5 rounded-md p-[2px]"
              style={{ background: 'rgba(10,8,5,0.8)', boxShadow: `inset 0 0 0 1.5px ${targetReached ? '#5ec27a' : '#c9a227'}` }}
            >
              <div
                className="h-full rounded-[3px] transition-[width] duration-300"
                style={{ width: `${hud.destructionPct}%`, background: targetReached ? 'linear-gradient(90deg,#6fce8a,#3f9b5d)' : 'linear-gradient(90deg,#e3c45a,#c9a227)' }}
              />
              {targetPct > 0 && (
                <span
                  className="absolute top-[-3px] bottom-[-3px] w-[2.5px] rounded-full"
                  style={{ left: `${targetPct}%`, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }}
                />
              )}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: targetReached ? '#9ff0b4' : 'rgba(244,238,218,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
              {targetReached
                ? (ctx.locale.startsWith('en') ? `✓ Target ${targetPct}% reached` : `✓ Objectif ${targetPct}% atteint`)
                : (ctx.locale.startsWith('en') ? 'Fortress destroyed' : 'Forteresse détruite')}
            </div>
          </div>
        </>
      )}

      {/* ── Coach de tir : doigt fantôme qui tire la fronde puis relâche ── */}
      {hud && !hud.interacted && hud.phase === 'aim' && (
        <div className="pointer-events-none absolute bottom-[24%] left-[16%] flex flex-col items-center">
          {/* trajectoire de recul suggérée */}
          <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden className="absolute -left-2 -top-1 opacity-70">
            <path d="M58 12 Q34 18 18 44" fill="none" stroke="#e3c463" strokeWidth="2"
              strokeLinecap="round" strokeDasharray="2 6" />
          </svg>
          {/* doigt fantôme animé */}
          <div className="relative h-14 w-14">
            <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-coach-pull rounded-full border-2 border-white/85 bg-white/25" />
          </div>
          <span className="mt-1 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] backdrop-blur" style={{ color: '#e3c463' }}>
            {ctx.locale.startsWith('en') ? 'Pull back & release' : 'Tire vers l’arrière, relâche'}
          </span>
        </div>
      )}

      {/* ── Contrôles (z élevé : jamais masqués) ── */}
      <div className="absolute bottom-3 left-3 z-40 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onQuit}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#cdbfa0] active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); }}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#cdbfa0] active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

    </div>
  );
}

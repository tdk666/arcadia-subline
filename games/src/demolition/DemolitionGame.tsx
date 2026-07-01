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
import { IconBlast, IconClock, IconKeg, IconSound } from '../icons';

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
  const [showHelp, setShowHelp] = useState(false);
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

  const en = ctx.locale.startsWith('en');
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

      {/* ── HUD — BARRE HAUTE pleine largeur, TOUJOURS rendue (valeurs par défaut tant
           que le moteur n'a pas émis), texte + icônes. Le compteur de pavés et le %
           de destruction sont désormais impossibles à manquer (retours fondateur). ── */}
      {(() => {
        const shotsLeft = Math.max(0, hud?.shotsLeft ?? maxShots);
        const pct = hud?.destructionPct ?? 0;
        const tDown = hud?.targetsDown ?? 0;
        const tTotal = hud?.totalTargets ?? 3;
        const timeLeftS = hud?.timeLeftS ?? null;
        return (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start gap-2 px-3 pb-4 pt-[max(env(safe-area-inset-top),0.4rem)]"
            style={{ background: 'linear-gradient(to bottom, rgba(12,9,6,0.92) 0%, rgba(12,9,6,0.5) 62%, transparent 100%)' }}
          >
            {/* station + palier */}
            <div className="flex-none leading-none">
              <div className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
                {ctx.stationName}
              </div>
              <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.28em]" style={{ color: '#e3c463' }}>
                {TIER_LABEL[ctx.difficulty]}
              </div>
            </div>

            {/* DESTRUCTION % — centre, grand chiffre + barre */}
            <div className="min-w-0 flex-1 text-center">
              <div className="font-display font-extrabold leading-none tabular-nums" style={{ fontSize: 'clamp(1.4rem,7vw,2.1rem)', color: targetReached ? '#9ff0b4' : '#f4eeda', textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}>
                {pct}%{targetPct > 0 && <span className="ml-1 text-sm font-bold" style={{ color: targetReached ? '#9ff0b4' : '#e3c463' }}>/ {targetPct}%</span>}
              </div>
              <div className="relative mx-auto mt-1 h-2 max-w-[180px] overflow-hidden rounded-md" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div className="h-full rounded-md transition-[width] duration-300" style={{ width: `${pct}%`, background: targetReached ? 'linear-gradient(90deg,#6fce8a,#3f9b5d)' : 'linear-gradient(90deg,#e3c45a,#c9a227)' }} />
                {targetPct > 0 && <span className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: `${targetPct}%` }} />}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(244,238,218,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}>
                {ctx.locale.startsWith('en') ? 'Fortress destroyed' : 'Forteresse détruite'}
              </div>
            </div>

            {/* pavés restants (TEXTE + icône) · étendards · chrono */}
            <div className="flex flex-none flex-col items-end gap-1">
              <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}>
                <PaveIcon size={14} />
                <span className="font-display text-sm font-extrabold tabular-nums text-white">
                  {shotsLeft}<span className="text-[10px] text-white/60">/{maxShots}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: tTotal }).map((_, i) => <StandardIcon key={i} down={i < tDown} size={12} />)}
                </span>
                {timeLeftS !== null && (
                  <span className="ml-1 font-display text-sm font-extrabold tabular-nums" style={{ color: urgent ? '#ff6b6b' : '#e3c463' }}>{timeLeftS}s</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
          aria-label={en ? 'Sound' : 'Son'}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#cdbfa0] active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          <IconSound size={16} off={muted} />
        </button>
        {/* aide : revoir l'objectif et les commandes à tout moment (façon Angry Birds) */}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          aria-label={en ? 'Help' : 'Aide'}
          className="rounded-lg px-3.5 py-2 text-xs font-bold text-[#e3c463] active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          ?
        </button>
      </div>

      {/* ── OVERLAY D'AIDE : objectif + commandes, rappelable à tout moment ── */}
      {showHelp && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 p-5 text-left"
            style={{ background: 'var(--color-plomb)', borderColor: '#c9a227' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-extrabold text-pierre">{en ? 'Your objective' : 'Ton objectif'}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-pierre-dim">
              <li className="flex items-center gap-2">
                <span className="flex-none" style={{ color: '#bb2e2a' }}><StandardIcon size={15} /></span>
                {en ? `Knock down the ${hud?.totalTargets ?? 3} royal standards` : `Abats les ${hud?.totalTargets ?? 3} étendards royaux`}
              </li>
              {targetPct > 0 && (
                <li className="flex items-center gap-2">
                  <span className="flex-none" style={{ color: '#9c7d18' }}><IconBlast size={15} /></span>
                  {en ? `Destroy ${targetPct}% of the fortress` : `Détruis ${targetPct}% de la forteresse`}
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="flex-none"><PaveIcon size={15} /></span>
                {en ? `${maxShots} cannonballs in all` : `${maxShots} boulets en tout`}
              </li>
              {Number((ctx.params as Record<string, number>).timeLimitS ?? 0) > 0 && (
                <li className="flex items-center gap-2">
                  <span className="flex-none" style={{ color: '#5d5446' }}><IconClock size={15} /></span>
                  {en ? `Before ${(ctx.params as Record<string, number>).timeLimitS}s` : `Avant ${(ctx.params as Record<string, number>).timeLimitS} s`}
                </li>
              )}
            </ul>
            <p className="mt-3 border-t border-rail pt-3 text-sm text-pierre-dim">
              {en ? 'Pull the cobblestone back, aim, release.' : 'Tire le pavé vers l’arrière, vise, relâche.'}
            </p>
            <p className="mt-1.5 flex items-start gap-2 text-sm font-semibold" style={{ color: '#9c5f30' }}>
              <span className="mt-0.5 flex-none"><IconKeg size={15} /></span>
              {en ? 'Hit the powder kegs: they explode and blow away the stone around them.' : 'Vise les barils de poudre : ils explosent et soufflent la pierre autour.'}
            </p>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-xl py-3 font-display font-extrabold text-encre active:translate-y-[1px]"
              style={{ background: 'var(--color-laiton)', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}
            >
              {en ? 'Back to the assault' : 'Retour à l’assaut'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

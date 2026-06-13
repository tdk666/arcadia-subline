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
const TIER_TINT = { bronze: '#c08a55', silver: '#b9c0c4', gold: '#e3c463' } as const;

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
  const startRef = useRef(0);
  const sfx = useMemo(() => new DemolitionSfx(), []);

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
    return () => engine.destroy();
    // le moteur vit exactement aussi longtemps que l'écran de jeu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.questId]);

  // l'AudioContext ne peut naître que d'un geste utilisateur
  function unlockAudio() {
    sfx.unlock();
    sfx.setMuted(muted);
  }

  const urgent = hud?.timeLeftS != null && (hud.timeLeftS ?? 99) <= 10;

  return (
    <div
      className="relative h-full w-full touch-none select-none"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}
      onPointerDown={unlockAudio}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

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
            {/* pavés restants */}
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}
            >
              <PaveIcon />
              <span className="text-[17px] font-extrabold leading-none text-pierre">{Math.max(hud.shotsLeft, 0)}</span>
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

          {/* ── Barre de destruction (sous la plaque) ── */}
          <div className="pointer-events-none absolute left-3 top-[68px] w-[210px]">
            <div
              className="h-2.5 rounded-md p-[2px]"
              style={{ background: 'rgba(10,8,5,0.6)', boxShadow: 'inset 0 0 0 1.5px #c9a227' }}
            >
              <div
                className="h-full rounded-[3px] transition-[width] duration-300"
                style={{ width: `${hud.destructionPct}%`, background: 'linear-gradient(90deg,#e3c45a,#c9a227)' }}
              />
            </div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-pierre/85">
              Destruction — {hud.destructionPct}%
            </div>
          </div>
        </>
      )}

      {/* ── Hint geste : main qui tire la fronde (DA, pas d'emoji) ── */}
      {hud && !hud.interacted && hud.phase === 'aim' && (
        <div className="pointer-events-none absolute bottom-[22%] left-[12%] animate-pulse">
          <svg width="92" height="64" viewBox="0 0 92 64" aria-hidden>
            <path d="M78 14 Q40 8 16 44" fill="none" stroke="#e3c463" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray="2 6" />
            <path d="M24 34 L14 46 L28 48" fill="none" stroke="#e3c463" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="46" r="6" fill="#e0964a" opacity="0.9" />
          </svg>
          <span className="block pl-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#e3c463' }}>
            Tirez
          </span>
        </div>
      )}

      {/* ── Contrôles ── */}
      <div className="absolute bottom-3 left-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onQuit}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-pierre-dim active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); }}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-pierre-dim active:scale-95"
          style={{ background: 'rgba(15,11,7,0.74)', boxShadow: 'inset 0 0 0 1.5px #3a2f1e' }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* badge de palier (teinte médaille) */}
      <div
        className="pointer-events-none absolute bottom-3 right-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ background: 'rgba(15,11,7,0.74)', color: TIER_TINT[ctx.difficulty], boxShadow: 'inset 0 0 0 1.5px currentColor' }}
      >
        ● {TIER_LABEL[ctx.difficulty]}
      </div>
    </div>
  );
}

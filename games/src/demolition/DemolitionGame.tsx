/**
 * Archétype DÉMOLITION — habillage « Prise de la Bastille ».
 * Composant conforme au contrat GameProps : monte le moteur physique + SFX,
 * affiche le HUD, et remonte la télémétrie brute via onFinish.
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

const TIER_LABEL_COLOR = { bronze: '#e0945a', silver: '#c9d2dc', gold: '#f2c200' } as const;

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

  const urgent = hud?.timeLeftS !== null && hud !== null && (hud.timeLeftS ?? 99) <= 10;

  return (
    <div className="relative h-full w-full touch-none select-none" onPointerDown={unlockAudio}>
      <canvas ref={canvasRef} className="h-full w-full" />

      {hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] font-mono text-sm">
          {/* boulets restants */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur">
            {Array.from({ length: Math.max(hud.shotsLeft, 0) }).map((_, i) => (
              <span
                key={i}
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-cyan-300 bg-slate-800 shadow-[0_0_6px_rgba(110,196,232,0.6)]"
              />
            ))}
            {hud.shotsLeft === 0 && <span className="text-slate-400">—</span>}
          </div>

          <div className="flex items-center gap-2">
            {hud.timeLeftS !== null && (
              <span
                className={`rounded-xl border border-white/10 px-3 py-2 backdrop-blur transition-colors ${
                  urgent ? 'animate-pulse bg-rose-600/70 font-bold text-white' : 'bg-black/45 text-amber-300'
                }`}
              >
                {hud.timeLeftS}s
              </span>
            )}
            {/* étendards */}
            <span className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur">
              {Array.from({ length: hud.totalTargets }).map((_, i) => (
                <span key={i} className={i < hud.targetsDown ? 'opacity-30 grayscale' : ''}>⚜</span>
              ))}
            </span>
            {/* destruction */}
            <span className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-cyan-300 backdrop-blur">
              {hud.destructionPct}%
            </span>
          </div>
        </div>
      )}

      {/* badge de palier */}
      <div
        className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),0.75rem)] -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur"
        style={{ color: TIER_LABEL_COLOR[ctx.difficulty] }}
      >
        ● {ctx.difficulty}
      </div>

      {/* hint geste : visible tant que le joueur n'a pas saisi le boulet */}
      {hud && !hud.interacted && hud.phase === 'aim' && (
        <div className="pointer-events-none absolute bottom-[16%] left-[8%] animate-bounce text-4xl opacity-80">
          <span className="inline-block -rotate-45">👆</span>
          <span className="ml-1 inline-block text-2xl text-cyan-300">↩</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onQuit}
          className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2 font-mono text-xs text-slate-300 backdrop-blur active:scale-95"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); }}
          className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2 font-mono text-xs text-slate-300 backdrop-blur active:scale-95"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}

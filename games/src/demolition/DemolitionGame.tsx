/**
 * Archétype DÉMOLITION — habillage « Prise de la Bastille ».
 * Composant conforme au contrat GameProps : il monte le moteur physique,
 * affiche le HUD, et remonte la télémétrie brute via onFinish.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../contract';
import { DemolitionEngine, type HudState } from './engine';
import { bastilleLevel } from './levels/bastille';
import type { DemolitionParams } from './types';

const DEFAULTS: DemolitionParams = {
  maxShots: 5,
  hpMultiplier: 1,
  targetPct: 0,
  timeLimitS: 0,
  reinforced: false,
};

export default function DemolitionGame({ ctx, onFinish, onQuit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const params: DemolitionParams = { ...DEFAULTS, ...(ctx.params as Partial<DemolitionParams>) };
    startRef.current = performance.now();
    const engine = new DemolitionEngine({
      canvas,
      level: bastilleLevel, // futur : résolu par stationSlug quand d'autres skins existeront
      params,
      reducedMotion: ctx.reducedMotion,
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

  return (
    <div className="relative h-full w-full touch-none select-none">
      <canvas ref={canvasRef} className="h-full w-full" />
      {hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 font-mono text-sm">
          <div className="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur">
            {Array.from({ length: Math.max(hud.shotsLeft, 0) }).map((_, i) => (
              <span key={i} className="inline-block h-3.5 w-3.5 rounded-full border-2 border-cyan-300 bg-slate-800" />
            ))}
            {hud.shotsLeft === 0 && <span className="text-slate-400">—</span>}
          </div>
          <div className="flex items-center gap-2">
            {hud.timeLeftS !== null && (
              <span
                className={`rounded-lg px-3 py-1.5 backdrop-blur ${hud.timeLeftS <= 10 ? 'bg-rose-600/60 text-white' : 'bg-black/40 text-amber-300'}`}
              >
                {hud.timeLeftS}s
              </span>
            )}
            <span className="rounded-lg bg-black/40 px-3 py-1.5 text-amber-300 backdrop-blur">
              ⚜ {hud.targetsDown}/{hud.totalTargets}
            </span>
            <span className="rounded-lg bg-black/40 px-3 py-1.5 text-cyan-300 backdrop-blur">
              {hud.destructionPct}%
            </span>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onQuit}
        className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur active:scale-95"
      >
        ✕
      </button>
    </div>
  );
}

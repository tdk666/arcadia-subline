/**
 * CONFETTIS TRICOLORES — la conquête qui « explose » à l'écran (DA Partie V,
 * persona Collégiens : « l'écran doit exploser », confettis Bleu-Blanc-Rouge).
 * INVARIANT : le tricolore est réservé à la victoire / conquête / fierté — ne
 * JAMAIS l'employer en décor neutre. Rare = puissant.
 *
 * Rendu pur GPU (transform + opacity uniquement), zéro asset, zéro dépendance,
 * auto-nettoyé après la rafale. Replié en silence si prefers-reduced-motion.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

const COLORS = ['#0a5a9e', '#ffffff', '#bb2e2a']; // bleu émail · blanc · vermillon

function prefersReduced(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

export function Confetti({ count = 42, durationMs = 1900, onDone }: { count?: number; durationMs?: number; onDone?: () => void }) {
  const [gone, setGone] = useState(false);
  const reduced = useRef(prefersReduced());

  // une rafale figée (positions/trajectoires tirées une seule fois)
  const pieces = useMemo(() => {
    if (reduced.current) return [];
    return Array.from({ length: count }, (_, i) => {
      const dx = (Math.random() * 2 - 1) * 46; // dérive horizontale en vw
      const fall = 78 + Math.random() * 24; // chute en vh
      const rot = (Math.random() * 2 - 1) * 720; // rotation totale
      const delay = Math.random() * 0.18;
      const dur = (durationMs / 1000) * (0.8 + Math.random() * 0.5);
      const left = 50 + (Math.random() * 2 - 1) * 30; // point de départ près du haut-centre
      const w = 6 + Math.random() * 6;
      const h = 9 + Math.random() * 8;
      const color = COLORS[i % COLORS.length];
      const round = Math.random() < 0.3; // quelques pastilles rondes
      return { dx, fall, rot, delay, dur, left, w, h, color, round, id: i };
    });
  }, [count, durationMs]);

  useEffect(() => {
    if (reduced.current || pieces.length === 0) { onDone?.(); return; }
    const id = window.setTimeout(() => { setGone(true); onDone?.(); }, durationMs + 250);
    return () => clearTimeout(id);
  }, [pieces.length, durationMs, onDone]);

  if (gone || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-[12%]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            boxShadow: p.color === '#ffffff' ? '0 0 0 0.5px rgba(0,0,0,0.08)' : undefined,
            // variables CSS custom consommées par le keyframe confetti-burst
            '--dx': `${p.dx}vw`,
            '--fall': `${p.fall}vh`,
            '--rot': `${p.rot}deg`,
            '--delay': `${p.delay}s`,
            '--dur': `${p.dur}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

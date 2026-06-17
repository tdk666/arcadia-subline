/**
 * BARRE DE STATUT persistante — l'identité qui suit le joueur partout (leçon
 * Duolingo : streak + progression toujours visibles = habitude). Socle de la
 * couche de rétention : la flamme de streak (aversion à la perte), le rang et
 * l'XP. Les récompenses quotidiennes/objectif du jour viendront s'y accrocher.
 */
import { useEffect, useState } from 'react';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';
import { useArcadia } from '../store';
import { rankLabel } from '../lib/rank';
import { IconFlame } from './icons';

export function StatusBar() {
  const { t } = useI18n();
  const user = useArcadia((s) => s.user);
  const lastResult = useArcadia((s) => s.lastResult); // re-lecture après une partie
  const [stats, setStats] = useState<{ xpTotal: number; streak: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void backend.getMyStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, [user, lastResult]);

  const xp = stats?.xpTotal ?? 0;
  const streak = stats?.streak ?? 0;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rail/70 bg-craie-2/80 px-4 py-1.5 backdrop-blur">
      <div className="flex items-center gap-1.5" title={t('profile.streak')}>
        <IconFlame size={18} className={streak > 0 ? 'text-ambre' : 'text-pierre-faint/60'} />
        <span className={`font-display text-sm font-extrabold tabular-nums ${streak > 0 ? 'text-pierre' : 'text-pierre-faint'}`}>
          {streak}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-[10px] uppercase tracking-wider text-pierre-faint">
          {rankLabel(t, xp)}
        </span>
        <span className="flex-none rounded-full bg-laiton/15 px-2 py-0.5 font-display text-xs font-extrabold tabular-nums text-laiton">
          {xp.toLocaleString()} <span className="text-[10px] font-bold text-pierre-faint">XP</span>
        </span>
      </div>
    </div>
  );
}

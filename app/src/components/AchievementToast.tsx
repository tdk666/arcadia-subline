import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useArcadia } from '../store';
import { liveStreak } from '../lib/daily';
import { playableStations } from '../lib/content';
import { ACHIEVEMENTS, buildSnapshot, unlockedAchievements } from '../lib/achievements';
import { haptic } from '../lib/feedback';

/**
 * HAUT FAIT DÉBLOQUÉ — la célébration de méta-progression (persona Stratège).
 * Global (monté dans AppLayout). Anti-spam : une « ligne de base » figée au 1er
 * rendu = les hauts faits DÉJÀ acquis ne re-célèbrent pas ; seuls les NOUVEAUX
 * déblocages de la session surgissent (en file, un à la fois). Pur lecteur de
 * l'état local — aucune mutation, aucun son fort (réservé à la victoire de jeu).
 */
export function AchievementToast() {
  const { t } = useI18n();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const storyUnlocked = useArcadia((s) => s.storyUnlocked);
  const coins = useArcadia((s) => s.coins);
  const daily = useArcadia((s) => s.daily);

  const unlocked = useMemo(
    () => unlockedAchievements(buildSnapshot({
      tiersWon, storyUnlocked, coins, streak: liveStreak(daily), playableTotal: playableStations().length,
    })),
    [tiersWon, storyUnlocked, coins, daily],
  );

  const baseline = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  // détecte les NOUVEAUX hauts faits (au 1er rendu : on fige la base, zéro toast rétro)
  useEffect(() => {
    if (baseline.current === null) { baseline.current = new Set(unlocked); return; }
    const fresh = unlocked.filter((id) => !baseline.current!.has(id));
    if (fresh.length > 0) {
      fresh.forEach((id) => baseline.current!.add(id));
      setQueue((q) => [...q, ...fresh]);
    }
  }, [unlocked]);

  // défile la file un à un
  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue((q) => q.slice(1));
    haptic([24, 44, 24]);
  }, [current, queue]);

  if (!current) return null;
  const a = ACHIEVEMENTS.find((x) => x.id === current);
  if (!a) return null;

  return (
    <button
      type="button"
      onClick={() => setCurrent(null)}
      className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[58] mx-auto flex max-w-xs items-center gap-3 rounded-2xl border border-laiton/60 bg-plomb px-4 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.28)] animate-pop"
      style={{ width: 'calc(100% - 2rem)' }}
    >
      <span className="animate-glow flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-laiton text-xl" style={{ background: 'var(--color-laiton)' }}>
        {a.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-laiton">{t('achievements.toastTitle')}</span>
        <span className="block truncate font-display text-sm font-extrabold text-pierre">{t(`achievements.${a.id}.title` as Parameters<typeof t>[0])}</span>
      </span>
      <span className="flex-none text-pierre-faint">›</span>
    </button>
  );
}

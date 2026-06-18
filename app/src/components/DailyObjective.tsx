import { useI18n } from '../i18n';
import { useArcadia } from '../store';
import { doneToday, liveStreak, todayProgress } from '../lib/daily';
import { IconFlame } from './icons';

/**
 * OBJECTIF DU JOUR — la carte d'habitude sur l'accueil (Duolingo). Donne une
 * raison de revenir CHAQUE jour ; la série (streak) joue l'aversion à la perte.
 * Purement local (cf. lib/daily) — fonctionne en démo comme en Supabase.
 */
export function DailyObjective() {
  const { t } = useI18n();
  const daily = useArcadia((s) => s.daily);
  const done = doneToday(daily);
  const progress = todayProgress(daily);
  const streak = liveStreak(daily);
  const goal = daily.goal;

  return (
    <div
      className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        done ? 'border-guimard/50 bg-guimard/10' : 'border-ambre/45 bg-ambre/10'
      }`}
    >
      <span
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${
          done ? 'bg-guimard/20 text-vermillon' : 'bg-ambre/20 text-ambre'
        }`}
      >
        <IconFlame size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-extrabold text-pierre">
          {done ? t('daily.done') : goal > 1 ? t('daily.todoPlural', { n: goal }) : t('daily.todo', { n: goal })}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-pierre-dim">
          {streak > 0 ? `${t('daily.streakTitle')} · ${streak}` : !done ? t('daily.atRisk') : ''}
        </p>
      </div>
      {/* pastilles de progression du jour */}
      <div className="flex flex-none gap-1">
        {Array.from({ length: goal }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${i < progress ? 'bg-vermillon' : 'bg-rail'}`}
          />
        ))}
      </div>
    </div>
  );
}

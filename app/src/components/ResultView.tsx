import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TIER_ORDER } from '@arcadia/games';
import { useI18n } from '../i18n';
import { backend } from '../lib/backend';
import { useArcadia, type LastResult } from '../store';
import { AuthSheet } from './AuthSheet';

/** Compteur animé (le "juice" du score). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value === 0) { setShown(0); return; }
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

export function ResultView({ result, stationName }: { result: LastResult; stationName: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useArcadia((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);
  // point de conversion : APRÈS la victoire, si invité en mode Supabase
  const showGuestSave = result.success && !user && backend.mode === 'supabase';

  const tierIdx = TIER_ORDER.indexOf(result.tier);
  const nextTier = tierIdx >= 0 && tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-tunnel/95 px-6 text-center">
      <div className="animate-pop">
        <p className="font-mono text-xs uppercase tracking-widest text-neon-faint">{stationName} · {t(`station.tiers.${result.tier}`)}</p>
        <h1
          className={`mt-1 font-display text-4xl font-extrabold tracking-tight ${
            result.success ? 'animate-glow text-gold-metro' : 'text-neon-dim'
          }`}
        >
          {result.success ? t('result.victory') : t('result.defeat')}
        </h1>
      </div>

      <div className="animate-slide-up flex w-full max-w-xs flex-col gap-2.5">
        <div className="rounded-2xl border border-rail bg-quai px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neon-faint">{t('result.score')}</p>
          <p className="font-display text-5xl font-extrabold text-cyan-metro">
            <CountUp value={result.score} />
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 rounded-2xl border border-rail bg-quai px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-neon-faint">{t('result.xp')}</p>
            <p className="font-display text-2xl font-extrabold text-[#b6bd00]">
              +<CountUp value={result.xpGained} />
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-rail bg-quai px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-neon-faint">{t('result.mastery')}</p>
            <p className="font-display text-2xl font-extrabold text-magenta-metro">
              <CountUp value={result.mastery} />
            </p>
          </div>
        </div>
        {result.success && result.xpGained === 0 && !result.flagged && (
          <p className="text-xs text-neon-faint">{t('result.bestScore')}</p>
        )}
        {result.flagged && <p className="text-xs text-orange-300">⚠ {t('result.flagged')}</p>}
        {result.localOnly && (
          <p className="font-mono text-[11px] text-magenta-metro">◦ {t('result.localOnly')}</p>
        )}
      </div>

      {showGuestSave && (
        <div className="animate-slide-up w-full max-w-xs rounded-2xl border border-gold-metro/50 bg-gold-metro/10 p-4">
          <p className="font-display font-bold text-gold-metro">★ {t('result.guestSave.title')}</p>
          <p className="mt-1 text-xs text-neon-dim">{t('result.guestSave.body')}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-gold-metro py-2.5 font-display text-sm font-bold text-tunnel active:scale-[0.98]"
            onClick={() => setAuthOpen(true)}
          >
            {t('result.guestSave.cta')}
          </button>
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-2">
        {result.success && nextTier ? (
          <button
            type="button"
            className="rounded-xl bg-cyan-metro py-3 font-display font-bold text-tunnel active:scale-[0.98]"
            onClick={() => { navigate(`/play/${result.slug}/${nextTier}`); navigate(0); }}
          >
            ⬆ {t('result.nextTier')} · {t(`station.tiers.${nextTier}`)}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl bg-cyan-metro py-3 font-display font-bold text-tunnel active:scale-[0.98]"
            onClick={() => navigate(0)}
          >
            ↻ {t('result.replay')}
          </button>
        )}
        <div className="flex gap-2">
          <Link
            to={`/station/${result.slug}`}
            className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-neon-dim active:bg-quai-hi"
          >
            {t('result.toStation')}
          </Link>
          <Link
            to="/leaderboard"
            className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-neon-dim active:bg-quai-hi"
          >
            ♛ {t('result.toLeaderboard')}
          </Link>
        </div>
      </div>

      {authOpen && (
        <AuthSheet intro={t('result.guestSave.body')} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}

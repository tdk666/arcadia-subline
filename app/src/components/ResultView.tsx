import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { useI18n } from '../i18n';
import { backend } from '../lib/backend';
import type { StationContent } from '../lib/content';
import { useArcadia, type LastResult } from '../store';
import { AuthSheet } from './AuthSheet';
import { ArchiveCard } from './ArchiveCard';

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

/* ── Écran de résultat ──────────────────────────────────────────────── */

export function ResultView({
  result, station, onReplay, onNextTier,
}: {
  result: LastResult;
  station: StationContent;
  onReplay: () => void;
  onNextTier: (tier: DifficultyTier) => void;
}) {
  const { t } = useI18n();
  const user = useArcadia((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  // point de conversion : APRÈS la victoire, si invité en mode Supabase
  const showGuestSave = result.success && !user && backend.mode === 'supabase';

  const archiveSeenKey = `arcadia.archive.seen.${station.slug}`;
  const archiveIsNew = result.success && !localStorage.getItem(archiveSeenKey);

  const tierIdx = TIER_ORDER.indexOf(result.tier);
  const nextTier = tierIdx >= 0 && tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;

  function openArchive() {
    localStorage.setItem(archiveSeenKey, '1');
    setArchiveOpen(true);
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-craie/95 px-6 py-8 text-center">
      <div className="animate-pop">
        <p className="font-mono text-xs uppercase tracking-widest text-pierre-faint">
          {station.name} · {t(`station.tiers.${result.tier}`)}
        </p>
        <h1
          className={`mt-1 font-display text-4xl font-extrabold tracking-tight ${
            result.success ? 'animate-glow text-laiton' : 'text-pierre-dim'
          }`}
        >
          {result.success ? t('result.victory') : t('result.defeat')}
        </h1>
      </div>

      <div className="animate-slide-up flex w-full max-w-xs flex-col gap-2.5">
        <div className="rounded-2xl border border-rail bg-plomb px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">{t('result.score')}</p>
          <p className="font-display text-5xl font-extrabold text-ambre">
            <CountUp value={result.score} />
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 rounded-2xl border border-rail bg-plomb px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">{t('result.xp')}</p>
            <p className="font-display text-2xl font-extrabold text-[#6b7a1a]">
              +<CountUp value={result.xpGained} />
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-rail bg-plomb px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">{t('result.mastery')}</p>
            <p className="font-display text-2xl font-extrabold text-vermillon">
              <CountUp value={result.mastery} />
            </p>
          </div>
        </div>
        {result.success && result.xpGained === 0 && !result.flagged && (
          <p className="text-xs text-pierre-faint">{t('result.bestScore')}</p>
        )}
        {result.flagged && <p className="text-xs text-vermillon">⚠ {t('result.flagged')}</p>}
        {result.localOnly && (
          <p className="font-mono text-[11px] text-vermillon">◦ {t('result.localOnly')}</p>
        )}
      </div>

      {/* la récompense culturelle : un objet à ouvrir, pas un bloc de texte */}
      {result.success && (
        <button
          type="button"
          onClick={openArchive}
          className="animate-slide-up flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 border-guimard/60 bg-guimard/10 px-4 py-3 text-left transition active:scale-[0.98]"
          style={{ animationDelay: '0.2s' }}
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#3f6b4d] text-xl ${archiveIsNew ? 'animate-glow' : ''}`}>
            ⚜
          </span>
          <span className="flex-1">
            <span className="block font-display text-sm font-bold text-[#3f6b4d]">
              {archiveIsNew ? `★ ${t('archive.unlocked')}` : t('station.story.title')}
            </span>
            <span className="block font-mono text-[10px] text-pierre-faint">
              {t('archive.number', { n: station.archive.number })} — {t('archive.open')}
            </span>
          </span>
          <span className="text-pierre-faint">›</span>
        </button>
      )}

      {showGuestSave && (
        <div className="animate-slide-up w-full max-w-xs rounded-2xl border border-laiton/50 bg-laiton/10 p-4" style={{ animationDelay: '0.3s' }}>
          <p className="font-display font-bold text-laiton">★ {t('result.guestSave.title')}</p>
          <p className="mt-1 text-xs text-pierre-dim">{t('result.guestSave.body')}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-laiton py-2.5 font-display text-sm font-bold text-encre active:scale-[0.98]"
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
            className="rounded-xl bg-ambre py-3 font-display font-bold text-encre active:scale-[0.98]"
            onClick={() => onNextTier(nextTier)}
          >
            ⬆ {t('result.nextTier')} · {t(`station.tiers.${nextTier}`)}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl bg-ambre py-3 font-display font-bold text-encre active:scale-[0.98]"
            onClick={onReplay}
          >
            ↻ {t('result.replay')}
          </button>
        )}
        <div className="flex gap-2">
          <Link
            to={`/station/${result.slug}`}
            className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-pierre-dim active:bg-plomb-hi"
          >
            {t('result.toStation')}
          </Link>
          <Link
            to="/leaderboard"
            className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-pierre-dim active:bg-plomb-hi"
          >
            ♛ {t('result.toLeaderboard')}
          </Link>
        </div>
      </div>

      {archiveOpen && <ArchiveCard station={station} onClose={() => setArchiveOpen(false)} />}
      {authOpen && (
        <AuthSheet intro={t('result.guestSave.body')} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}

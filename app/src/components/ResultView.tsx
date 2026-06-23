import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { useI18n } from '../i18n';
import { backend } from '../lib/backend';
import type { StationContent } from '../lib/content';
import { useArcadia, type LastResult } from '../store';
import { tap, victory } from '../lib/feedback';
import { share } from '../lib/share';
import { AuthSheet } from './AuthSheet';
import { ArchiveCard } from './ArchiveCard';
import { Confetti } from './Confetti';
import { Button } from './Button';

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
  const [shareMsg, setShareMsg] = useState(false);

  // Le climax : la conquête « explose » (confettis tricolores + fanfare). Une
  // seule fois, à l'arrivée d'un résultat gagnant (tricolore = victoire only).
  useEffect(() => {
    if (result.success) victory();
  }, [result.success]);

  async function onShare() {
    tap();
    const res = await share(
      {
        title: t('result.shareTitle'),
        text: t('result.shareText', { station: station.name, score: result.score }),
      },
      'result',
    );
    if (res === 'copied') { setShareMsg(true); window.setTimeout(() => setShareMsg(false), 2200); }
  }
  // point de conversion : APRÈS la victoire, si invité en mode Supabase
  const showGuestSave = result.success && !user && backend.mode === 'supabase';

  const archiveSeenKey = `arcadia.archive.seen.${station.slug}`;
  const archiveIsNew = result.success && !localStorage.getItem(archiveSeenKey);

  const tierIdx = TIER_ORDER.indexOf(result.tier);
  const nextTier = tierIdx >= 0 && tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;

  // L'habillage « Bastille tombée » est propre à la démolition ; les autres
  // archétypes (quiz…) prennent une bannière générique.
  const isDemolition = station.game.archetype === 'demolition';
  const victoryText = isDemolition ? t('result.victory') : t('result.victoryGeneric');
  const defeatText = isDemolition ? t('result.defeat') : t('result.defeatGeneric');

  function openArchive() {
    localStorage.setItem(archiveSeenKey, '1');
    setArchiveOpen(true);
  }

  // Banque V2 : la progression se lit en POINTS vers un seuil, pas en « maîtrise »
  // (jargon nu jugé ambigu au playtest). On affiche un état positif et clair.
  const isBanked = result.pointsThreshold != null && result.pointsThreshold > 0 && result.pointsTotal != null;
  const progressed = isBanked && !result.success && !result.flagged && result.score > 0;
  const remaining = isBanked ? Math.max(0, (result.pointsThreshold as number) - (result.pointsTotal as number)) : 0;
  const pctToThreshold = isBanked
    ? Math.min(100, Math.round(((result.pointsTotal as number) / (result.pointsThreshold as number)) * 100))
    : 0;

  const headline = isBanked
    ? (result.success ? t('result.tierCleared') : progressed ? t('result.progress') : t('result.tryAgain'))
    : (result.success ? victoryText : defeatText);
  const positive = result.success || progressed;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-craie/95 px-6 py-8 text-center">
      {result.success && <Confetti />}
      <div className="animate-pop">
        <p className="font-mono text-xs uppercase tracking-widest text-pierre-faint">
          {station.name} · {t(`station.tiers.${result.tier}`)}
        </p>
        <h1
          className={`mt-1 font-display text-4xl font-extrabold tracking-tight ${
            positive ? 'animate-glow text-laiton' : 'text-pierre-dim'
          }`}
        >
          {headline}
        </h1>
        {isBanked ? (
          <p className="mt-2 text-sm text-pierre-dim">
            {result.success
              ? t('result.tierClearedHint')
              : progressed
                ? t('result.progressHint', { n: remaining })
                : t('result.tryAgainHint')}
          </p>
        ) : (
          !result.success && <p className="mt-2 text-sm text-pierre-dim">{t('result.defeatHint')}</p>
        )}
      </div>

      <div className="animate-slide-up flex w-full max-w-xs flex-col gap-2.5">
        {isBanked ? (
          <>
            {/* points gagnés cette manche — la récompense lisible, sans jargon */}
            <div className="rounded-2xl border border-rail bg-plomb px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">{t('result.pointsWon')}</p>
              <p className="font-display text-5xl font-extrabold" style={{ color: positive ? '#3f6b4d' : '#5d5446' }}>
                +<CountUp value={result.score} />
              </p>
            </div>
            {/* progression vers le palier */}
            <div className="rounded-2xl border border-rail bg-plomb px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">
                {result.success
                  ? t('result.tierUnlocked')
                  : t('station.quizPoints', { pts: Math.min(result.pointsTotal as number, result.pointsThreshold as number), threshold: result.pointsThreshold as number })}
              </p>
              <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-rail/50">
                <span className="block h-full rounded-full bg-laiton" style={{ width: `${pctToThreshold}%` }} />
              </span>
            </div>
          </>
        ) : (
          <>
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
          </>
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
          <Button variant="gold" size="sm" className="mt-3" onClick={() => setAuthOpen(true)}>
            {t('result.guestSave.cta')}
          </Button>
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-2">
        {result.success && nextTier ? (
          <Button variant="gold" size="md" onClick={() => onNextTier(nextTier)}>
            ⬆ {t('result.nextTier')} · {t(`station.tiers.${nextTier}`)}
          </Button>
        ) : (
          <Button variant="gold" size="md" onClick={onReplay}>
            ↻ {t('result.replay')}
          </Button>
        )}
        {/* Partage = vecteur d'acquisition organique #1 (vanité du joueur). En
            « thumb zone », réservé à la victoire (on ne partage pas une défaite). */}
        {result.success && (
          <Button variant="secondary" size="md" onClick={onShare}>
            ↗ {shareMsg ? t('result.shareCopied') : t('result.share')}
          </Button>
        )}
        <div className="flex gap-2">
          <Link
            to={`/station/${result.slug}`}
            onClick={() => tap()}
            className="flex-1 rounded-xl border border-rail py-2.5 text-center text-sm text-pierre-dim active:bg-plomb-hi"
          >
            {t('result.toStation')}
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => tap()}
            className="flex-1 rounded-xl border border-rail py-2.5 text-center text-sm text-pierre-dim active:bg-plomb-hi"
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

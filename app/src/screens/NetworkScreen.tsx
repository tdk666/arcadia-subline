import { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getLineContent, NETWORK, playableStations } from '../lib/content';
import { challengeOfDay } from '../lib/challenge';
import { doneToday, liveStreak } from '../lib/daily';
import { DailyObjective } from '../components/DailyObjective';
import { StationSheet } from '../components/StationSheet';
import { IconFlame } from '../components/icons';
import { tap } from '../lib/feedback';
import { track } from '../lib/analytics';
import { useArcadia } from '../store';

/**
 * LE RÉSEAU — l'accueil. La carte EST l'app (Pokémon GO / Citymapper) : un vrai
 * moteur WebGL (MapLibre, cf. MapView) en plein écran, chargé en lazy. Par-dessus,
 * l'objectif du jour (habitude) et le CTA héros « Défi du jour » en thumb-zone :
 * 1-tap-to-play vers le prochain palier sensé, en mode express (brief sauté si la
 * station est déjà connue). Le rituel quotidien réclamé par le board.
 */
const MapView = lazy(() => import('../components/MapView').then((m) => ({ default: m.MapView })));

function conqueredCount(code: string, tiersWon: Record<string, string[]>): { done: number; total: number } | null {
  const content = getLineContent(code);
  if (!content) return null;
  const done = content.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;
  return { done, total: content.stations.length };
}

export function NetworkScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const daily = useArcadia((s) => s.daily);
  const [station, setStation] = useState<{ slug: string; name: string } | null>(null);

  const playableLines = NETWORK.lines.filter((l) => l.status === 'playable');
  const totals = playableLines.reduce(
    (acc, l) => {
      const c = conqueredCount(l.code, tiersWon);
      return c ? { done: acc.done + c.done, total: acc.total + c.total } : acc;
    },
    { done: 0, total: 0 },
  );
  const playableCodes = useMemo(
    () => new Set(NETWORK.lines.filter((l) => l.status === 'playable').map((l) => l.code)),
    [],
  );

  function openStation(slug: string, name: string) {
    tap();
    setStation({ slug, name });
  }

  // ── DÉFI DU JOUR : le rituel quotidien + 1-tap-to-play (loi UX #2, board) ──
  const challenge = useMemo(() => challengeOfDay(playableStations(), tiersWon), [tiersWon]);
  const challengeDone = doneToday(daily);
  const streak = liveStreak(daily);

  function playChallenge() {
    if (!challenge) return;
    tap();
    track('daily_challenge_launch', { slug: challenge.slug, tier: challenge.tier, replay: challenge.isReplay, doneToday: challengeDone });
    // ?x=1 : mode express — saute le briefing pour une station déjà connue
    navigate(`/play/${challenge.slug}/${challenge.tier}?x=1`);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── En-tête compact + objectif du jour (fixes) ── */}
      <div className="px-4 pt-3">
        <header className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold tracking-tight">{t('network.title')}</h1>
            <p className="truncate text-[11px] text-pierre-dim">{t('network.subtitle', { city: NETWORK.city })}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-base font-extrabold text-laiton">
              {totals.done}<span className="text-pierre-faint">/{totals.total}</span>
            </p>
            <p className="font-mono text-[8px] uppercase tracking-widest text-pierre-faint">{t('network.progress')}</p>
          </div>
        </header>
        <DailyObjective />
      </div>

      {/* ── LA CARTE plein écran (WebGL réel) + CTA héros flottant ── */}
      <div className="relative mt-2 min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-[#0d1726] font-mono text-xs text-pierre-faint/70">
              {t('common.loading')}
            </div>
          }
        >
          <MapView playableCodes={playableCodes} onStation={openStation} />
        </Suspense>

        {challenge && (
          <button
            type="button"
            onClick={playChallenge}
            className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-email/95 p-3 text-left text-white shadow-[0_6px_0_#073f6e,0_10px_22px_rgba(10,90,158,0.35)] ring-2 ring-white/80 ring-inset backdrop-blur transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_3px_0_#073f6e]"
          >
            <span
              className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full text-white"
              style={{ background: challengeDone ? 'var(--color-guimard)' : 'var(--color-vermillon)', boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -3px 5px rgba(0,0,0,0.25)' }}
            >
              <IconFlame size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-laiton-clair">
                {challengeDone ? `✓ ${t('network.challengeDone')}` : `★ ${t('network.dailyChallenge')}`}
                {streak > 0 && <span className="text-white/70"> · {t('daily.streakTitle')} {streak}</span>}
              </span>
              <span className="block truncate font-display text-base font-extrabold">
                {challenge.name} <span className="font-mono text-xs font-bold text-laiton-clair">· {t(`station.tiers.${challenge.tier}`)}</span>
              </span>
            </span>
            <span className="flex-none rounded-lg bg-laiton px-3 py-1.5 font-display text-xs font-extrabold text-encre">
              {challengeDone ? t('network.again') : t('network.playNow')}
            </span>
          </button>
        )}
      </div>

      {station && <StationSheet slug={station.slug} name={station.name} onClose={() => setStation(null)} />}
    </div>
  );
}

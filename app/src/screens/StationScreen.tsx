import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { pickText, useI18n } from '../i18n';
import { backend } from '../lib/backend';
import type { LeaderboardEntry } from '../lib/backend/types';
import { getStationContent, isBankedQuiz, tierThreshold } from '../lib/content';
import { presenceProviders } from '../lib/presence';
import { PRESENCE_REQUIRED } from '../lib/flags';
import { useArcadia } from '../store';
import { AuthSheet } from '../components/AuthSheet';
import { Leaderboard } from '../components/Leaderboard';
import { track } from '../lib/analytics';
import { tap } from '../lib/feedback';

const EMPTY_TIERS: DifficultyTier[] = [];

/** Médailles de palier frappées comme des jetons de métro (laiton/argent/bronze). */
const TIER_STYLE: Record<DifficultyTier, { ring: string; text: string; medal: string; rim: string; roman: string }> = {
  bronze: {
    ring: 'border-[#9c5f30]', text: 'text-[#c08a55]', roman: 'I',
    medal: 'radial-gradient(circle at 38% 32%, #d79a63, #9c5f30 55%, #5e3618)', rim: '#3a2110',
  },
  silver: {
    ring: 'border-[#7d868c]', text: 'text-[#b9c0c4]', roman: 'II',
    medal: 'radial-gradient(circle at 38% 32%, #f4f6f7, #bfc6ca 55%, #7d868c)', rim: '#4a5258',
  },
  gold: {
    ring: 'border-laiton', text: 'text-laiton-clair', roman: 'III',
    medal: 'radial-gradient(circle at 38% 32%, #fbe9a6, #c9a227 55%, #86680f)', rim: '#5c4708',
  },
};

export function StationScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const content = getStationContent(slug);

  const user = useArcadia((s) => s.user);
  const tiersWon = useArcadia((s) => s.tiersWon[slug]) ?? EMPTY_TIERS;
  const masteryLocal = useArcadia((s) => s.mastery[slug] ?? 0);
  const storyUnlocked = useArcadia((s) => s.storyUnlocked[slug] ?? false);
  const isTierUnlocked = useArcadia((s) => s.isTierUnlocked);

  const [checkInUntil, setCheckInUntil] = useState<string | null>(null);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [serverState, setServerState] = useState<'discovered' | 'visited' | 'mastered' | null>(null);
  // Banque V2 : points cumulés + déblocage par palier (clé = tier)
  const [bankProg, setBankProg] = useState<Record<string, { pointsTotal: number; threshold: number; unlocked: boolean }>>({});
  // classement PAR STATION → titre « Chef de Station » (DEC-012)
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => { track('station_open', { slug }); }, [slug]);
  const [storyOpen, setStoryOpen] = useState(false);

  const banked = !!content && isBankedQuiz(content);

  const refresh = useCallback(async () => {
    if (!content) return;
    const [ci, prog] = await Promise.all([
      backend.getActiveCheckIn(content.stationId),
      backend.getMyStationProgress(content.stationId),
    ]);
    setCheckInUntil(ci?.expiresAt ?? null);
    setServerState(prog?.state ?? null);
    backend.getStationLeaderboard(content.stationId).then(setBoard).catch(() => setBoard([]));

    if (isBankedQuiz(content)) {
      const ids = TIER_ORDER.map((tr) => content.quests[tr].questId);
      const list = await backend.getQuestProgress(ids);
      const byTier: Record<string, { pointsTotal: number; threshold: number; unlocked: boolean }> = {};
      TIER_ORDER.forEach((tr) => {
        const e = list.find((x) => x.questId === content.quests[tr].questId);
        byTier[tr] = {
          pointsTotal: e?.pointsTotal ?? 0,
          threshold: e?.pointsThreshold ?? tierThreshold(content, tr),
          // serveur authoritatif si dispo ; sinon bronze libre, suivants par cumul local
          unlocked: e?.unlocked ?? (tr === 'bronze'),
        };
      });
      setBankProg(byTier);
    }
  }, [content]);

  useEffect(() => { void refresh(); }, [refresh, user]);

  if (!content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-pierre-dim">{t('station.comingSoon')}</p>
        <Link to="/" className="font-mono text-sm text-ambre">← {t('common.back')}</Link>
      </div>
    );
  }

  const mastery = Math.max(masteryLocal, serverState === 'mastered' ? 80 : 0);
  const isMastered = serverState === 'mastered';

  async function doCheckIn() {
    tap();
    if (!user) { setAuthOpen(true); return; }
    setCheckInBusy(true);
    setCooldownMsg(null);
    // MVP : seul le provider manuel est enregistré — l'UI prend le premier dispo
    const provider = presenceProviders[0];
    const res = await provider.checkIn(content!.stationId);
    setCheckInBusy(false);
    track('checkin', { slug, result: res.ok ? 'ok' : (res.error ?? 'error') });
    if (res.ok) {
      setCheckInUntil(res.expiresAt ?? null);
      void refresh();
    } else if (res.error === 'cooldown') {
      setCooldownMsg(t('checkin.cooldown', { s: res.cooldownS ?? 90 }));
    } else if (res.error === 'auth_required') {
      setAuthOpen(true);
    } else {
      setCooldownMsg(t('common.error'));
    }
  }

  return (
    <div className="px-4 pb-8 pt-4">
      <Link to="/" className="font-mono text-xs text-pierre-faint">← {t('map.title')}</Link>

      {/* plaque émaillée */}
      <div className="mt-3 rounded-xl border border-rail bg-[#0a5a9e] px-5 py-4 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.85)]">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
          {content.name}
        </h1>
      </div>

      <p className="mt-3 text-center text-sm italic text-pierre-dim">
        {pickText(content.game.tagline, locale)}
      </p>

      {/* statut + maîtrise */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-rail bg-plomb px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-pierre-faint">
            {t('station.mastery')}
          </p>
          <p className="font-display text-2xl font-extrabold text-ambre">{mastery}<span className="text-sm text-pierre-faint">/100</span></p>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold ${
            isMastered
              ? 'bg-guimard/20 text-[#3f6b4d]'
              : serverState === 'visited' || checkInUntil
                ? 'bg-ambre/15 text-ambre'
                : tiersWon.length
                  ? 'bg-laiton/15 text-laiton'
                  : 'bg-rail/40 text-pierre-faint'
          }`}
        >
          {isMastered
            ? t('station.states.mastered')
            : serverState === 'visited'
              ? t('station.states.visited')
              : tiersWon.length
                ? t('station.states.discovered')
                : t('station.states.locked')}
        </span>
      </div>
      {isMastered && (
        <p className="animate-pop mt-2 text-center font-mono text-xs text-[#3f6b4d]">
          ★ {t('station.master.earned')}
        </p>
      )}

      {/* paliers */}
      <section className="mt-5">
        <h2 className="font-display text-lg font-bold">{pickText(content.game.title, locale)}</h2>
        {/* bannière de présence : visible UNIQUEMENT si le gate est actif (DEC-018,
            défaut off). Sinon elle mentirait (« sans points » alors que tout compte). */}
        {PRESENCE_REQUIRED && (
          <div
            className={`mt-2 rounded-xl px-3 py-2 text-xs ${
              checkInUntil ? 'border border-[#3f6b4d]/40 bg-[#3f6b4d]/10 text-[#3f6b4d]' : 'border border-ambre/40 bg-ambre/10 text-pierre-dim'
            }`}
          >
            {checkInUntil ? `✓ ${t('station.presence.scored')}` : `🎯 ${t('station.presence.training')}`}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2.5">
          {TIER_ORDER.map((tier) => {
            const bp = bankProg[tier];
            const unlocked = banked ? (bp?.unlocked ?? isTierUnlocked(slug, tier)) : isTierUnlocked(slug, tier);
            const won = banked
              ? !!bp && bp.threshold > 0 && bp.pointsTotal >= bp.threshold
              : tiersWon.includes(tier);
            const p = content.quests[tier].params as Record<string, number>;
            const style = TIER_STYLE[tier];
            return (
              <button
                key={tier}
                type="button"
                disabled={!unlocked}
                onClick={() => { tap(); navigate(`/play/${slug}/${tier}`); }}
                className={`flex items-center gap-3.5 rounded-xl border bg-plomb px-3.5 py-3 text-left transition active:scale-[0.985] disabled:opacity-45 ${style.ring} ${
                  unlocked ? 'active:bg-plomb-hi' : ''
                }`}
              >
                {/* médaille frappée — chiffre romain Marcellus */}
                <span
                  className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full"
                  style={{
                    background: unlocked ? style.medal : 'radial-gradient(circle at 38% 32%, #3a352c, #241f18)',
                    boxShadow: unlocked
                      ? 'inset 0 2px 4px rgba(255,245,210,0.45), inset 0 -4px 8px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.45)'
                      : 'inset 0 0 0 1px #3a2f1e',
                    filter: unlocked ? 'grayscale(0)' : 'grayscale(1)',
                  }}
                >
                  <span
                    className="font-display text-xl"
                    style={{ color: unlocked ? style.rim : '#5d5240', textShadow: '0 1px 0 rgba(255,245,210,0.35)' }}
                  >
                    {style.roman}
                  </span>
                  {won && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-laiton text-[10px] text-encre shadow">
                      ★
                    </span>
                  )}
                </span>

                <span className="flex-1">
                  <span className={`block font-display text-base font-extrabold ${style.text}`}>
                    {t(`station.tiers.${tier}`)}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-pierre-faint">
                    {!unlocked
                      ? t('station.tierLocked')
                      : banked
                        ? t('station.quizRules.banked', {
                            draw: Number((p as Record<string, unknown>).draw ?? 0),
                            lives: Number(p.lives ?? 0),
                            time: Number(p.timerS ?? 0),
                          })
                        : content.game.archetype === 'quiz'
                          ? t(`station.quizRules.${tier}`, {
                              q: ((p.questions as unknown as unknown[]) ?? []).length,
                              lives: Number(p.lives ?? 0),
                              time: Number(p.timerS ?? 0),
                            })
                          : t(`station.rules.${tier}`, {
                              shots: p.maxShots,
                              pct: p.targetPct,
                              time: p.timeLimitS,
                            })}
                  </span>
                  {/* banque : progression points vers le seuil de palier */}
                  {banked && unlocked && bp && bp.threshold > 0 && (
                    <span className="mt-1 block">
                      <span className="mb-0.5 block font-mono text-[9px] text-pierre-faint">
                        {t('station.quizPoints', { pts: Math.min(bp.pointsTotal, bp.threshold), threshold: bp.threshold })}
                      </span>
                      <span className="block h-1 w-full overflow-hidden rounded-full bg-rail/50">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.round((bp.pointsTotal / bp.threshold) * 100))}%`, background: style.text.includes('laiton') ? '#c9a227' : 'currentColor' }}
                        />
                      </span>
                    </span>
                  )}
                </span>

                <span className="flex-none text-xs">
                  {won ? (
                    <span className="font-semibold text-laiton">{t('station.tierDone')}</span>
                  ) : unlocked ? (
                    <span className={`font-semibold ${style.text}`}>▶</span>
                  ) : (
                    <span className="text-pierre-faint">🔒</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CLASSEMENT PAR STATION — couronne « Chef de Station » (DEC-012). TOUJOURS
          présent (même vide → « sois le premier ») : ouvrir une station montre
          toujours son trône, c'est le cœur de la compétition par station. */}
      <section className="mt-5 rounded-xl border border-rail bg-plomb p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm font-bold">{t('station.leaderboard.title')}</h3>
          <span className="truncate font-mono text-[10px] uppercase tracking-wider" style={{ color: '#9c7d18' }}>
            👑 {t('station.leaderboard.chef')} : {board.length ? (board[0].isMe ? t('leaderboard.you') : board[0].displayName) : '—'}
          </span>
        </div>
        {board.length > 0 && board[0].isMe && (
          <div className="animate-pop mt-2 flex items-center gap-2 rounded-lg border border-laiton/60 bg-laiton/15 px-3 py-2">
            <span className="text-lg" aria-hidden>👑</span>
            <span className="font-display text-sm font-extrabold text-pierre">{t('station.leaderboard.sacre')}</span>
          </div>
        )}
        {board.length > 0 ? (
          <>
            <Leaderboard entries={board} className="mt-4" />
            {!board.some((e) => e.isMe) && (
              <p className="mt-3 font-mono text-[10px] text-pierre-faint">{t('station.leaderboard.joinHint')}</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-pierre-dim">{t('station.leaderboard.joinHint')}</p>
        )}
      </section>

      {/* check-in — SUR-COUCHE optionnelle, jamais bloquante */}
      <section className="mt-5 rounded-xl border border-dashed border-rail bg-craie-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold">{t('checkin.title')}</h3>
            <p className="mt-0.5 text-xs text-pierre-dim">{t('checkin.subtitle')}</p>
          </div>
          <span className="rounded bg-rail/40 px-1.5 py-0.5 font-mono text-[9px] text-pierre-faint">
            {t('checkin.optional')}
          </span>
        </div>
        {checkInUntil ? (
          <p className="animate-pop mt-3 font-mono text-sm text-[#3f6b4d]">
            ✓ {t('checkin.done')} · {t('checkin.activeUntil')}{' '}
            {new Date(checkInUntil).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <button
            type="button"
            disabled={checkInBusy}
            onClick={doCheckIn}
            className="mt-3 w-full rounded-xl border border-ambre/50 bg-ambre/10 py-2.5 font-mono text-sm font-bold text-ambre transition active:scale-[0.98] disabled:opacity-50"
          >
            {checkInBusy ? t('common.loading') : t('checkin.cta', { station: content.name })}
          </button>
        )}
        {cooldownMsg && <p className="mt-2 text-xs text-vermillon">{cooldownMsg}</p>}
        {!user && <p className="mt-2 text-xs text-pierre-faint">{t('checkin.needAccount')}</p>}
        <p className="mt-2 font-mono text-[10px] text-pierre-faint/70">{t('checkin.future')}</p>
      </section>

      {/* fiche savoir — l'âme culturelle, jamais imposée */}
      <section className="mt-5 rounded-xl border border-guimard/40 bg-guimard/5 p-4">
        <h3 className="font-display text-sm font-bold text-[#3f6b4d]">{t('station.story.title')}</h3>
        <p className="mt-1.5 text-sm italic text-pierre-dim">{pickText(content.story.teaser, locale)}</p>
        {storyUnlocked ? (
          <>
            {storyOpen && (
              <div className="animate-slide-up mt-3 text-sm leading-relaxed text-pierre">
                <p>{pickText(content.story.body, locale)}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {(content.story.facts[locale] ?? content.story.facts.fr).map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-pierre-dim">
                      <span className="text-[#3f6b4d]">⚜</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              className="mt-2 font-mono text-xs text-[#3f6b4d] underline-offset-2 active:underline"
              onClick={() => setStoryOpen(!storyOpen)}
            >
              {storyOpen ? '▴' : '▾'} {t('station.story.title')}
            </button>
          </>
        ) : (
          <p className="mt-2 font-mono text-[10px] text-pierre-faint">🔒 {t('station.story.lockedHint')}</p>
        )}
      </section>

      {authOpen && <AuthSheet onClose={() => { setAuthOpen(false); void refresh(); }} />}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { pickText, useI18n } from '../i18n';
import { backend } from '../lib/backend';
import { getStationContent } from '../lib/content';
import { presenceProviders } from '../lib/presence';
import { useArcadia } from '../store';
import { AuthSheet } from '../components/AuthSheet';

const EMPTY_TIERS: DifficultyTier[] = [];

const TIER_STYLE: Record<DifficultyTier, { ring: string; text: string }> = {
  bronze: { ring: 'border-[#b87333]', text: 'text-[#e0945a]' },
  silver: { ring: 'border-[#9aa6b4]', text: 'text-[#c9d2dc]' },
  gold: { ring: 'border-gold-metro', text: 'text-gold-metro' },
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
  const [storyOpen, setStoryOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!content) return;
    const [ci, prog] = await Promise.all([
      backend.getActiveCheckIn(content.stationId),
      backend.getMyStationProgress(content.stationId),
    ]);
    setCheckInUntil(ci?.expiresAt ?? null);
    setServerState(prog?.state ?? null);
  }, [content]);

  useEffect(() => { void refresh(); }, [refresh, user]);

  if (!content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-neon-dim">{t('station.comingSoon')}</p>
        <Link to="/" className="font-mono text-sm text-cyan-metro">← {t('common.back')}</Link>
      </div>
    );
  }

  const mastery = Math.max(masteryLocal, serverState === 'mastered' ? 80 : 0);
  const isMastered = serverState === 'mastered';

  async function doCheckIn() {
    if (!user) { setAuthOpen(true); return; }
    setCheckInBusy(true);
    setCooldownMsg(null);
    // MVP : seul le provider manuel est enregistré — l'UI prend le premier dispo
    const provider = presenceProviders[0];
    const res = await provider.checkIn(content!.stationId);
    setCheckInBusy(false);
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
      <Link to="/" className="font-mono text-xs text-neon-faint">← {t('map.title')}</Link>

      {/* plaque émaillée */}
      <div className="mt-3 rounded-xl border border-rail bg-[#0064b0] px-5 py-4 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.85)]">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
          {content.name}
        </h1>
      </div>

      <p className="mt-3 text-center text-sm italic text-neon-dim">
        {pickText(content.game.tagline, locale)}
      </p>

      {/* statut + maîtrise */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-rail bg-quai px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neon-faint">
            {t('station.mastery')}
          </p>
          <p className="font-display text-2xl font-extrabold text-cyan-metro">{mastery}<span className="text-sm text-neon-faint">/100</span></p>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold ${
            isMastered
              ? 'bg-guimard/20 text-[#4dd08a]'
              : serverState === 'visited' || checkInUntil
                ? 'bg-cyan-metro/15 text-cyan-metro'
                : tiersWon.length
                  ? 'bg-gold-metro/15 text-gold-metro'
                  : 'bg-rail/40 text-neon-faint'
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
        <p className="animate-pop mt-2 text-center font-mono text-xs text-[#4dd08a]">
          ★ {t('station.master.earned')}
        </p>
      )}

      {/* paliers */}
      <section className="mt-5">
        <h2 className="font-display text-lg font-bold">{pickText(content.game.title, locale)}</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          {TIER_ORDER.map((tier) => {
            const unlocked = isTierUnlocked(slug, tier);
            const won = tiersWon.includes(tier);
            const p = content.quests[tier].params as Record<string, number>;
            const style = TIER_STYLE[tier];
            return (
              <button
                key={tier}
                type="button"
                disabled={!unlocked}
                onClick={() => navigate(`/play/${slug}/${tier}`)}
                className={`flex items-center gap-3 rounded-xl border-2 bg-quai px-4 py-3 text-left transition active:scale-[0.985] disabled:opacity-40 ${style.ring} ${
                  unlocked ? 'active:bg-quai-hi' : ''
                }`}
              >
                <span className={`font-display text-lg font-extrabold ${style.text}`}>
                  {t(`station.tiers.${tier}`)}
                </span>
                <span className="flex-1 text-right font-mono text-[10px] leading-tight text-neon-faint">
                  {!unlocked
                    ? t('station.tierLocked')
                    : t(`station.rules.${tier}`, {
                        shots: p.maxShots,
                        pct: p.targetPct,
                        time: p.timeLimitS,
                      })}
                </span>
                <span className="w-12 text-right font-mono text-xs">
                  {won ? (
                    <span className="text-gold-metro">★ {t('station.tierDone')}</span>
                  ) : unlocked ? (
                    <span className={style.text}>▶ {t('station.play')}</span>
                  ) : (
                    '🔒'
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* check-in — SUR-COUCHE optionnelle, jamais bloquante */}
      <section className="mt-5 rounded-xl border border-dashed border-rail bg-tunnel-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold">{t('checkin.title')}</h3>
            <p className="mt-0.5 text-xs text-neon-dim">{t('checkin.subtitle')}</p>
          </div>
          <span className="rounded bg-rail/40 px-1.5 py-0.5 font-mono text-[9px] text-neon-faint">
            {t('checkin.optional')}
          </span>
        </div>
        {checkInUntil ? (
          <p className="animate-pop mt-3 font-mono text-sm text-[#4dd08a]">
            ✓ {t('checkin.done')} · {t('checkin.activeUntil')}{' '}
            {new Date(checkInUntil).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <button
            type="button"
            disabled={checkInBusy}
            onClick={doCheckIn}
            className="mt-3 w-full rounded-xl border border-cyan-metro/50 bg-cyan-metro/10 py-2.5 font-mono text-sm font-bold text-cyan-metro transition active:scale-[0.98] disabled:opacity-50"
          >
            {checkInBusy ? t('common.loading') : t('checkin.cta', { station: content.name })}
          </button>
        )}
        {cooldownMsg && <p className="mt-2 text-xs text-orange-300">{cooldownMsg}</p>}
        {!user && <p className="mt-2 text-xs text-neon-faint">{t('checkin.needAccount')}</p>}
        <p className="mt-2 font-mono text-[10px] text-neon-faint/70">{t('checkin.future')}</p>
      </section>

      {/* fiche savoir — l'âme culturelle, jamais imposée */}
      <section className="mt-5 rounded-xl border border-guimard/40 bg-guimard/5 p-4">
        <h3 className="font-display text-sm font-bold text-[#4dd08a]">{t('station.story.title')}</h3>
        <p className="mt-1.5 text-sm italic text-neon-dim">{pickText(content.story.teaser, locale)}</p>
        {storyUnlocked ? (
          <>
            {storyOpen && (
              <div className="animate-slide-up mt-3 text-sm leading-relaxed text-neon">
                <p>{pickText(content.story.body, locale)}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {(content.story.facts[locale] ?? content.story.facts.fr).map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-neon-dim">
                      <span className="text-[#4dd08a]">⚜</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              className="mt-2 font-mono text-xs text-[#4dd08a] underline-offset-2 active:underline"
              onClick={() => setStoryOpen(!storyOpen)}
            >
              {storyOpen ? '▴' : '▾'} {t('station.story.title')}
            </button>
          </>
        ) : (
          <p className="mt-2 font-mono text-[10px] text-neon-faint">🔒 {t('station.story.lockedHint')}</p>
        )}
      </section>

      {authOpen && <AuthSheet onClose={() => { setAuthOpen(false); void refresh(); }} />}
    </div>
  );
}

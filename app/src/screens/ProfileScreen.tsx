import { useEffect, useState } from 'react';
import { useI18n, type Locale } from '../i18n';
import { backend } from '../lib/backend';
import { LINE } from '../lib/content';
import { rankLabel, rankProgress } from '../lib/rank';
import { useArcadia } from '../store';
import { AuthSheet } from '../components/AuthSheet';
import { Button } from '../components/Button';

export function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const user = useArcadia((s) => s.user);
  const tiersWon = useArcadia((s) => s.tiersWon);
  const pending = useArcadia((s) => s.pending);
  const [stats, setStats] = useState<{ xpTotal: number; streak: number } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);

  const conquered = LINE.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;

  useEffect(() => {
    let alive = true;
    void backend.getMyStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('profile.title')}</h1>

      {/* carte d'identité du conquérant */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-rail bg-gradient-to-br from-[#eef4fa] via-plomb to-[#f4ecdb] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
        <div className="pointer-events-none absolute -right-4 -top-6 text-[80px] opacity-10">◈</div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-vermillon">
          {t('profile.rank')} — {rankLabel(t, stats?.xpTotal ?? 0)}
        </p>
        <p className="mt-1 font-display text-xl font-extrabold">
          {user ? user.displayName : t('profile.guest')}
        </p>
        <p className="mt-0.5 text-xs text-pierre-faint">
          {user?.email ? t('profile.connected', { email: user.email }) : t('profile.localProgress')}
        </p>
        {pending.length > 0 && user && (
          <p className="mt-1 font-mono text-[11px] text-ambre">{t('auth.pendingSync')}</p>
        )}

        {/* courbe de progression : XP vers le rang suivant */}
        {(() => {
          const { pct, next, remaining } = rankProgress(stats?.xpTotal ?? 0);
          return (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-craie-2 shadow-[inset_0_0_0_1px_var(--color-rail)]">
                <div className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#e3c45a,#c9a227)' }} />
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-pierre-faint">
                {next === null
                  ? t('profile.maxRank')
                  : t('profile.toNextRank', { n: remaining.toLocaleString(), rank: rankLabel(t, next) })}
              </p>
            </div>
          );
        })()}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-craie-2 py-3">
            <p className="font-display text-xl font-extrabold text-[#6b7a1a]">{stats?.xpTotal ?? 0}</p>
            <p className="font-mono text-[9px] uppercase text-pierre-faint">{t('profile.xp')}</p>
          </div>
          <div className="rounded-xl bg-craie-2 py-3">
            <p className="font-display text-xl font-extrabold text-laiton">
              {stats?.streak ?? 0}<span className="text-xs">{t('profile.streakUnit')}</span>
            </p>
            <p className="font-mono text-[9px] uppercase text-pierre-faint">{t('profile.streak')}</p>
          </div>
          <div className="rounded-xl bg-craie-2 py-3">
            <p className="font-display text-xl font-extrabold text-vermillon">{conquered}</p>
            <p className="font-mono text-[9px] uppercase text-pierre-faint">{t('profile.stations')}</p>
          </div>
        </div>

        <Button
          variant={user ? 'secondary' : 'gold'}
          size="sm"
          className="mt-4"
          onClick={() => (user ? void backend.signOut() : setAuthOpen(true))}
        >
          {user ? t('auth.signoutCta') : t('auth.signupTitle')}
        </Button>
      </div>

      {/* langue */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-rail bg-plomb px-5 py-4">
        <span className="text-sm font-semibold">{t('profile.language')}</span>
        <div className="flex gap-1 rounded-lg bg-craie-2 p-1">
          {(['fr', 'en'] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase transition ${
                locale === l ? 'bg-ambre text-encre' : 'text-pierre-faint'
              }`}
              onClick={() => setLocale(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* revoir l'intro */}
      <button
        type="button"
        className="mt-4 w-full rounded-2xl border border-rail bg-plomb px-5 py-4 text-left text-sm font-semibold active:bg-plomb-hi"
        onClick={() => window.dispatchEvent(new Event('arcadia:replay-intro'))}
      >
        ▶ {t('profile.replayIntro')}
      </button>

      {/* installation PWA */}
      <div className="mt-4 rounded-2xl border border-rail bg-plomb px-5 py-4">
        <p className="text-sm font-semibold">{t('profile.install')}</p>
        <p className="mt-0.5 text-xs text-pierre-faint">{t('profile.installHint')}</p>
        {installEvt && (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-ambre/50 bg-ambre/10 py-2.5 font-mono text-sm font-bold text-ambre active:scale-[0.98]"
            onClick={() => (installEvt as Event & { prompt?: () => void }).prompt?.()}
          >
            ⬇ {t('profile.install')}
          </button>
        )}
      </div>

      {backend.mode === 'demo' && (
        <p className="mt-4 text-center font-mono text-[11px] text-vermillon">
          {t('demo.banner')} — {t('demo.detail')}
        </p>
      )}

      {authOpen && <AuthSheet onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

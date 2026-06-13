import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { backend, type LeaderboardEntry } from '../lib/backend';
import { LINE } from '../lib/content';
import { useArcadia } from '../store';

export function LeaderboardScreen() {
  const { t } = useI18n();
  const user = useArcadia((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    backend.getLineLeaderboard(LINE.id)
      .then((e) => { if (alive) setEntries(e); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [user]);

  return (
    <div className="px-4 pb-6 pt-5">
      <header className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-encre"
          style={{ background: LINE.color }}
        >
          ♛
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('leaderboard.title')}</h1>
          <p className="text-xs text-pierre-dim">{t('leaderboard.subtitle')}</p>
        </div>
      </header>

      {error && <p className="mt-6 text-center text-sm text-pierre-dim">{t('common.error')}</p>}
      {!error && entries === null && (
        <p className="mt-6 text-center font-mono text-sm text-pierre-faint">{t('common.loading')}</p>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="mt-6 text-center text-sm text-pierre-dim">{t('leaderboard.empty')}</p>
      )}

      {/* rivalité vivante : la cible juste au-dessus de toi */}
      {entries !== null && (() => {
        const meIdx = entries.findIndex((e) => e.isMe);
        if (meIdx <= 0) return null;
        const rival = entries[meIdx - 1];
        const gap = rival.score - entries[meIdx].score;
        return (
          <div className="animate-slide-up mt-4 flex items-center gap-3 rounded-2xl border border-vermillon/50 bg-vermillon/10 px-4 py-3">
            <span className="text-xl">⚔</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-vermillon">
                {t('leaderboard.rival')}
              </p>
              <p className="truncate text-sm font-bold text-pierre">{rival.displayName}</p>
            </div>
            <span className="font-mono text-xs font-bold text-vermillon">
              {t('leaderboard.rivalGap', { n: gap.toLocaleString() })}
            </span>
          </div>
        );
      })()}

      {entries !== null && entries.length > 0 && (
        <ol className="mt-5 flex flex-col gap-1.5">
          {entries.map((e) => (
            <li
              key={e.playerId}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                e.isMe
                  ? 'animate-pop border border-laiton/60 bg-laiton/10'
                  : 'border border-rail bg-plomb'
              }`}
            >
              <span
                className={`w-8 text-center font-display text-lg font-extrabold ${
                  e.rank === 1 ? 'text-laiton' : e.rank === 2 ? 'text-[#c9d2dc]' : e.rank === 3 ? 'text-[#e0945a]' : 'text-pierre-faint'
                }`}
              >
                {e.rank}
              </span>
              <span className="flex-1 truncate text-sm font-semibold">
                {e.displayName}
                {e.isMe && (
                  <span className="ml-2 rounded bg-laiton/20 px-1.5 py-0.5 font-mono text-[9px] text-laiton">
                    {t('leaderboard.you')}
                  </span>
                )}
              </span>
              <span className="font-mono text-sm font-bold text-ambre">{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {!user && (
        <p className="mt-5 text-center text-xs text-pierre-faint">{t('leaderboard.guestHint')}</p>
      )}
    </div>
  );
}

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
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-tunnel"
          style={{ background: LINE.color }}
        >
          ♛
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('leaderboard.title')}</h1>
          <p className="text-xs text-neon-dim">{t('leaderboard.subtitle')}</p>
        </div>
      </header>

      {error && <p className="mt-6 text-center text-sm text-neon-dim">{t('common.error')}</p>}
      {!error && entries === null && (
        <p className="mt-6 text-center font-mono text-sm text-neon-faint">{t('common.loading')}</p>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="mt-6 text-center text-sm text-neon-dim">{t('leaderboard.empty')}</p>
      )}

      {entries !== null && entries.length > 0 && (
        <ol className="mt-5 flex flex-col gap-1.5">
          {entries.map((e) => (
            <li
              key={e.playerId}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                e.isMe
                  ? 'animate-pop border border-gold-metro/60 bg-gold-metro/10'
                  : 'border border-rail bg-quai'
              }`}
            >
              <span
                className={`w-8 text-center font-display text-lg font-extrabold ${
                  e.rank === 1 ? 'text-gold-metro' : e.rank === 2 ? 'text-[#c9d2dc]' : e.rank === 3 ? 'text-[#e0945a]' : 'text-neon-faint'
                }`}
              >
                {e.rank}
              </span>
              <span className="flex-1 truncate text-sm font-semibold">
                {e.displayName}
                {e.isMe && (
                  <span className="ml-2 rounded bg-gold-metro/20 px-1.5 py-0.5 font-mono text-[9px] text-gold-metro">
                    {t('leaderboard.you')}
                  </span>
                )}
              </span>
              <span className="font-mono text-sm font-bold text-cyan-metro">{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {!user && (
        <p className="mt-5 text-center text-xs text-neon-faint">{t('leaderboard.guestHint')}</p>
      )}
    </div>
  );
}

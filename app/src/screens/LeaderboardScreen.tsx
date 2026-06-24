import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { backend, type LeaderboardEntry } from '../lib/backend';
import { Mascotte } from '../components/Mascotte';
import { Leaderboard } from '../components/Leaderboard';
import { useArcadia } from '../store';

export function LeaderboardScreen() {
  const { t } = useI18n();
  const user = useArcadia((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  // Page « Classement » du menu = GÉNÉRAL (tout Paris, tous joueurs) — pas une ligne
  // précise (tu n'es pas forcément sur la Ligne 1). Le classement par station se voit
  // À la station ; tes positions, dans le Profil.
  useEffect(() => {
    let alive = true;
    backend.getGlobalLeaderboard()
      .then((e) => { if (alive) setEntries(e); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [user]);

  return (
    <div className="px-4 pb-6 pt-5">
      <header className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-encre"
          style={{ background: 'radial-gradient(circle at 38% 30%,#fbe9a6,#c9a227 62%,#86680f)' }}
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
        <div className="mt-8 flex flex-col items-center text-center">
          <Mascotte size={140} className="animate-pop" />
          <p className="mt-2 text-sm text-pierre-dim">{t('leaderboard.empty')}</p>
        </div>
      )}

      {/* tableau vertical (du 1er au dernier) + ligne « toi » + cible à dépasser */}
      {entries !== null && entries.length > 0 && (
        <Leaderboard entries={entries} className="mt-5" />
      )}

      {!user && (
        <p className="mt-5 text-center text-xs text-pierre-faint">{t('leaderboard.guestHint')}</p>
      )}
    </div>
  );
}

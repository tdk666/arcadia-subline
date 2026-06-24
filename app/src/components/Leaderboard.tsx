/**
 * CLASSEMENT « best-in-class » — podium (top 3 sur des socles) + reste en liste +
 * ligne « TOI » collante avec l'écart à dépasser (cible motivante, façon Strava/
 * Clash Royale). Réutilisable (Chef de Station, Maître de la Ligne, etc.).
 * Lit des LeaderboardEntry (déjà classés) ; ne calcule aucun score.
 */
import type { LeaderboardEntry } from '../lib/backend/types';
import { useI18n } from '../i18n';

function initials(name: string): string {
  const t = name.trim();
  return (t.slice(0, 2) || '?').toUpperCase();
}

const PODIUM = {
  1: { ring: '#c9a227', medal: 'radial-gradient(circle at 38% 30%,#fbe9a6,#c9a227 60%,#86680f)', h: 'h-20', crown: '👑' },
  2: { ring: '#9aa3a9', medal: 'radial-gradient(circle at 38% 30%,#f4f6f7,#bfc6ca 60%,#7d868c)', h: 'h-14', crown: '' },
  3: { ring: '#b87a45', medal: 'radial-gradient(circle at 38% 30%,#d79a63,#9c5f30 60%,#5e3618)', h: 'h-11', crown: '' },
} as const;

function Avatar({ name, rank, isMe }: { name: string; rank: 1 | 2 | 3; isMe: boolean }) {
  const p = PODIUM[rank];
  return (
    <span
      className={`relative flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-extrabold text-encre ${rank === 1 && !isMe ? '' : ''}`}
      style={{ background: p.medal, boxShadow: `0 0 0 2px ${isMe ? 'var(--color-email)' : p.ring}, 0 3px 8px rgba(0,0,0,0.3)` }}
    >
      {initials(name)}
      {p.crown && <span className="absolute -top-4 text-lg">{p.crown}</span>}
    </span>
  );
}

export function Leaderboard({ entries, className = '' }: { entries: LeaderboardEntry[]; className?: string }) {
  const { t } = useI18n();
  if (entries.length === 0) return null;

  const top = entries.slice(0, 3);
  const order: LeaderboardEntry[] = top.length === 3 ? [top[1], top[0], top[2]] : top; // 2-1-3
  const rest = entries.slice(3, 8);
  const me = entries.find((e) => e.isMe) ?? null;
  const meShown = me ? me.rank <= (rest.length ? rest[rest.length - 1].rank : 3) : false;
  // écart pour dépasser le joueur juste au-dessus (cible)
  const meIdx = me ? entries.findIndex((e) => e.isMe) : -1;
  const above = meIdx > 0 ? entries[meIdx - 1] : null;
  const toOvertake = me && above ? Math.max(1, above.score - me.score) : 0;

  return (
    <div className={className}>
      {/* PODIUM */}
      <div className="flex items-end justify-center gap-2">
        {order.map((e) => {
          const rank = e.rank as 1 | 2 | 3;
          const p = PODIUM[rank] ?? PODIUM[3];
          return (
            <div key={e.playerId} className="flex flex-1 flex-col items-center">
              <Avatar name={e.displayName} rank={rank} isMe={e.isMe} />
              <span className="mt-1.5 max-w-full truncate text-center font-display text-[11px] font-bold text-pierre">
                {e.isMe ? t('leaderboard.you') : e.displayName}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-pierre-dim">{e.score.toLocaleString()}</span>
              <div
                className={`mt-1 flex w-full ${p.h} items-start justify-center rounded-t-lg pt-1 font-display text-sm font-extrabold`}
                style={{ background: e.isMe ? 'rgba(10,90,158,0.14)' : 'var(--color-craie-2)', boxShadow: `inset 0 2px 0 ${p.ring}`, color: p.ring }}
              >
                {rank}
              </div>
            </div>
          );
        })}
      </div>

      {/* RESTE (4..8) */}
      {rest.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {rest.map((e) => (
            <li key={e.playerId} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${e.isMe ? 'bg-email/10 ring-1 ring-email/40' : ''}`}>
              <span className="w-5 flex-none text-center font-mono text-[11px] text-pierre-faint">{e.rank}</span>
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-craie-2 font-mono text-[9px] font-bold text-pierre-dim">{initials(e.displayName)}</span>
              <span className="min-w-0 flex-1 truncate text-pierre-dim">{e.isMe ? t('leaderboard.you') : e.displayName}</span>
              <span className="font-display text-xs font-bold tabular-nums text-pierre">{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {/* LIGNE « TOI » + cible à dépasser (si hors du podium/liste ou à motiver) */}
      {me && me.rank > 1 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-email/40 bg-email/10 px-3 py-2">
          <span className="font-display text-sm font-extrabold tabular-nums text-email">#{me.rank}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-extrabold text-pierre">{t('leaderboard.you')}{!meShown && ' · ' + me.score.toLocaleString()}</span>
            {above && <span className="block font-mono text-[10px] text-pierre-dim">{t('leaderboard.toOvertake', { n: toOvertake.toLocaleString(), name: above.isMe ? t('leaderboard.you') : above.displayName })}</span>}
          </span>
          <span className="text-lg" aria-hidden>⬆</span>
        </div>
      )}
    </div>
  );
}

/**
 * CLASSEMENT — tableau VERTICAL (le format que tout le monde lit : un rang par
 * ligne, du 1er au dernier). Top 3 accentués (or/argent/bronze), couronne sur le
 * 1er, ligne « TOI » mise en avant + ligne collante avec l'écart à dépasser quand
 * tu es hors de la fenêtre affichée (cible motivante, façon Strava / Duolingo).
 * Réutilisable (Chef de Station, Classement de Paris, etc.). Lit des
 * LeaderboardEntry DÉJÀ classés ; ne calcule aucun score.
 */
import type { LeaderboardEntry } from '../lib/backend/types';
import { useI18n } from '../i18n';
import { IconCrown } from './icons';

function initials(name: string): string {
  return (name.trim().slice(0, 2) || '?').toUpperCase();
}

// accents de rang : 1er or, 2e argent, 3e bronze, reste neutre
const MEDAL: Record<number, { ring: string; bg: string }> = {
  1: { ring: '#c9a227', bg: 'radial-gradient(circle at 38% 30%,#fbe9a6,#c9a227 62%,#86680f)' },
  2: { ring: '#9aa3a9', bg: 'radial-gradient(circle at 38% 30%,#f4f6f7,#bfc6ca 62%,#7d868c)' },
  3: { ring: '#b87a45', bg: 'radial-gradient(circle at 38% 30%,#d79a63,#9c5f30 62%,#5e3618)' },
};

function Row({ e, crown }: { e: LeaderboardEntry; crown: boolean }) {
  const { t } = useI18n();
  const medal = MEDAL[e.rank];
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        e.isMe ? 'bg-email/10 ring-1 ring-email/40' : 'odd:bg-craie-2/60'
      }`}
    >
      {/* rang */}
      <span
        className="w-7 flex-none text-center font-display text-sm font-extrabold tabular-nums"
        style={{ color: medal ? medal.ring : 'var(--color-pierre-faint)' }}
      >
        {e.rank}
      </span>
      {/* pastille initiales (accent médaille pour le top 3) */}
      <span
        className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full font-display text-xs font-extrabold"
        style={
          medal
            ? { background: medal.bg, color: 'var(--color-encre)', boxShadow: `0 0 0 1.5px ${medal.ring}` }
            : { background: 'var(--color-craie-2)', color: 'var(--color-pierre-dim)' }
        }
      >
        {initials(e.displayName)}
        {crown && e.rank === 1 && <span className="absolute -top-3.5 leading-none text-laiton"><IconCrown size={15} /></span>}
      </span>
      {/* pseudo */}
      <span className={`min-w-0 flex-1 truncate font-display text-sm ${e.isMe ? 'font-extrabold text-email' : 'font-semibold text-pierre'}`}>
        {e.isMe ? t('leaderboard.you') : e.displayName}
      </span>
      {/* score */}
      <span className="font-display text-sm font-extrabold tabular-nums text-pierre">{e.score.toLocaleString()}</span>
    </li>
  );
}

export function Leaderboard({
  entries,
  className = '',
  crownTop = true,
  topN = 10,
}: {
  entries: LeaderboardEntry[];
  className?: string;
  crownTop?: boolean;
  topN?: number;
}) {
  const { t } = useI18n();
  if (entries.length === 0) return null;

  const shown = entries.slice(0, topN);
  const me = entries.find((e) => e.isMe) ?? null;
  const meShown = me ? shown.some((e) => e.isMe) : false;
  // écart pour dépasser le joueur juste au-dessus (cible)
  const meIdx = me ? entries.findIndex((e) => e.isMe) : -1;
  const above = meIdx > 0 ? entries[meIdx - 1] : null;
  const toOvertake = me && above ? Math.max(1, above.score - me.score) : 0;

  return (
    <div className={className}>
      <ul className="flex flex-col gap-1">
        {shown.map((e) => (
          <Row key={e.playerId} e={e} crown={crownTop} />
        ))}
      </ul>

      {/* ligne « TOI » collante quand tu es hors de la fenêtre affichée */}
      {me && !meShown && (
        <>
          <p className="my-1 text-center font-mono text-[10px] text-pierre-faint">⋯</p>
          <div className="flex items-center gap-3 rounded-xl border border-email/40 bg-email/10 px-3 py-2.5">
            <span className="w-7 flex-none text-center font-display text-sm font-extrabold tabular-nums text-email">{me.rank}</span>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-craie-2 font-display text-xs font-extrabold text-pierre-dim">{initials(me.displayName)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-extrabold text-email">{t('leaderboard.you')}</span>
              {above && <span className="block font-mono text-[10px] text-pierre-dim">{t('leaderboard.toOvertake', { n: toOvertake.toLocaleString(), name: above.isMe ? t('leaderboard.you') : above.displayName })}</span>}
            </span>
            <span className="font-display text-sm font-extrabold tabular-nums text-pierre">{me.score.toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
}

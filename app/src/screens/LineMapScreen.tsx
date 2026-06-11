import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { isPlayable, LINE } from '../lib/content';
import { useArcadia } from '../store';

export function LineMapScreen() {
  const { t } = useI18n();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const user = useArcadia((s) => s.user);
  const conquered = LINE.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;

  return (
    <div className="px-4 pb-6 pt-5">
      {/* plaque de ligne */}
      <header className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-tunnel"
          style={{ background: LINE.color }}
        >
          1
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('map.title')}</h1>
          <p className="text-xs text-neon-dim">{t('map.subtitle')}</p>
        </div>
      </header>

      <p className="mt-3 font-mono text-[11px] text-neon-faint">
        {conquered > 1
          ? t('map.conqueredPlural', { n: conquered })
          : t('map.conquered', { n: conquered })}
        {!user && <> · {t('map.playWithoutAccount')}</>}
      </p>

      {/* la ligne : rail vertical + stations */}
      <ol className="relative mt-5 ml-[21px] border-l-[3px]" style={{ borderColor: LINE.color }}>
        {LINE.stations.map((station) => {
          const won = (tiersWon[station.slug] ?? []).length > 0;
          const playable = isPlayable(station.slug);
          const bullet = (
            <span
              className={`absolute -left-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[3px] transition-all ${
                won
                  ? 'border-transparent shadow-[0_0_12px_rgba(242,194,0,0.6)]'
                  : playable
                    ? 'border-cyan-metro bg-tunnel shadow-[0_0_10px_rgba(110,196,232,0.45)]'
                    : 'border-neon-faint bg-tunnel'
              }`}
              style={won ? { background: LINE.color } : undefined}
            />
          );
          const row = (
            <div className="relative flex items-center gap-3 py-[9px] pl-6">
              {bullet}
              <span
                className={`flex-1 text-[15px] ${
                  playable ? 'font-semibold text-neon' : 'text-neon-faint'
                }`}
              >
                {station.name}
              </span>
              {playable && !won && (
                <span className="animate-glow rounded-md bg-gold-metro/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-metro">
                  {t('map.challengeAvailable')}
                </span>
              )}
              {won && <span className="text-sm text-gold-metro">★</span>}
              {!playable && (
                <span className="font-mono text-[10px] text-neon-faint/60">{t('common.soon')}</span>
              )}
            </div>
          );
          return (
            <li key={station.slug}>
              {playable ? (
                <Link
                  to={`/station/${station.slug}`}
                  className="block rounded-lg transition-colors active:bg-quai-hi"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

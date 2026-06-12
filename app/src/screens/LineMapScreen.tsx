import { Link } from 'react-router-dom';
import { pickText, useI18n } from '../i18n';
import { getStationContent, isPlayable, LINE } from '../lib/content';
import { useArcadia } from '../store';

export function LineMapScreen() {
  const { t, locale } = useI18n();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const user = useArcadia((s) => s.user);
  const conquered = LINE.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;
  const pct = Math.round((conquered / LINE.stations.length) * 100);

  // carte-héros : la première station jouable non (entièrement) conquise
  const hero = LINE.stations
    .map((s) => getStationContent(s.slug))
    .find((c) => c && (tiersWon[c.slug] ?? []).length < 3);

  return (
    <div className="px-4 pb-6 pt-5">
      {/* plaque de ligne */}
      <header className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-tunnel shadow-[0_0_18px_rgba(242,194,0,0.35)]"
          style={{ background: LINE.color }}
        >
          1
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('map.title')}</h1>
          <p className="truncate text-xs text-neon-dim">{t('map.subtitle')}</p>
        </div>
      </header>

      {/* jauge de conquête : le plateau a un état, une progression, un but */}
      <div className="mt-4 rounded-2xl border border-rail bg-quai px-4 py-3">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon-faint">
            {t('map.progress')}
          </p>
          <p className="font-display text-sm font-extrabold text-gold-metro">{pct}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-tunnel-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(pct, 2)}%`,
              background: `linear-gradient(90deg, ${LINE.color}, #ff7e2e)`,
              boxShadow: `0 0 10px ${LINE.color}`,
            }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-neon-faint">
          {conquered > 1 ? t('map.conqueredPlural', { n: conquered }) : t('map.conquered', { n: conquered })}
          {!user && <> · {t('map.playWithoutAccount')}</>}
        </p>
      </div>

      {/* carte-héros : le défi du jour appelle à l'assaut */}
      {hero && (
        <Link
          to={`/station/${hero.slug}`}
          className="relative mt-4 block overflow-hidden rounded-2xl border border-gold-metro/40 bg-gradient-to-br from-[#23170f] via-quai to-quai p-4 transition active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute -right-6 -top-8 text-[88px] opacity-15">⚜</div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold-metro">
            ★ {t('map.heroKicker')}
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-neon">
            {pickText(hero.game.title, locale)}
          </h2>
          <p className="mt-0.5 text-xs italic text-neon-dim">{pickText(hero.game.tagline, locale)}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {(['bronze', 'silver', 'gold'] as const).map((tr) => (
                <span
                  key={tr}
                  className={`h-2.5 w-2.5 rounded-full border ${
                    (tiersWon[hero.slug] ?? []).includes(tr)
                      ? 'border-gold-metro bg-gold-metro shadow-[0_0_6px_rgba(242,194,0,0.7)]'
                      : 'border-neon-faint/50 bg-transparent'
                  }`}
                />
              ))}
            </div>
            <span className="animate-glow rounded-lg bg-gold-metro px-3.5 py-1.5 font-display text-xs font-extrabold text-tunnel">
              ⚔ {t('map.heroCta')}
            </span>
          </div>
        </Link>
      )}

      <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-neon-faint">
        {t('map.board')}
      </p>

      {/* la ligne : rail vertical + stations */}
      <ol className="relative ml-[21px] mt-3 border-l-[3px]" style={{ borderColor: LINE.color }}>
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

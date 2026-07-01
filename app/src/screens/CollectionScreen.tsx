import { useState } from 'react';
import { pickText, useI18n } from '../i18n';
import { getStationContent, isPlayable, LINE, type StationContent } from '../lib/content';
import { useArcadia } from '../store';
import { ArchiveCard } from '../components/ArchiveCard';
import { track } from '../lib/analytics';
import { IconLock, IconSeal } from '../components/icons';

/**
 * LA COLLECTION — les « mémoires de Paris » qu'on gagne en conquérant les stations.
 * Chaque station conquise révèle sa carte d'archive (récit + faits). Méta-objectif
 * culturel : compléter la ligne. (Habillage Métro Clair ; la DA approfondie viendra.)
 */
export function CollectionScreen() {
  const { t, locale } = useI18n();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const [active, setActive] = useState<StationContent | null>(null);

  const collected = LINE.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;

  return (
    <div className="px-4 pb-6 pt-5">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-email font-display text-xl font-extrabold text-white shadow-[0_4px_12px_rgba(10,90,158,0.35)]">
          ❖
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('collection.title')}</h1>
          <p className="truncate text-xs text-pierre-dim">{t('collection.subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-extrabold text-laiton">{collected}<span className="text-pierre-faint">/{LINE.stations.length}</span></p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-pierre-faint">{t('collection.unit')}</p>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {LINE.stations.map((station) => {
          const content = getStationContent(station.slug);
          const playable = isPlayable(station.slug);
          const unlocked = !!content && (tiersWon[station.slug] ?? []).length > 0;

          if (unlocked && content) {
            return (
              <button
                key={station.slug}
                type="button"
                onClick={() => { track('archive_open', { slug: station.slug, source: 'collection' }); setActive(content); }}
                className="relative overflow-hidden rounded-2xl border border-laiton/55 bg-plomb p-3 text-left shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition active:scale-[0.98]"
                style={{ background: 'linear-gradient(160deg, #fffdf7 0%, #f6efdd 100%)' }}
              >
                <div className="flex items-start justify-between">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-guimard">
                    {pickText(content.archive.collection, locale)}
                  </p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-laiton/70 text-laiton"><IconSeal size={15} /></span>
                </div>
                <h2 className="mt-2 font-display text-base font-extrabold leading-tight tracking-tight text-pierre">
                  {station.name}
                </h2>
                <p className="mt-0.5 font-mono text-[9px] text-pierre-faint">
                  {t('archive.number', { n: content.archive.number })} · {pickText(content.archive.era, locale)}
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-laiton">{t('archive.open')} ›</p>
              </button>
            );
          }

          // scellée (jouable, pas encore conquise) ou à venir
          return (
            <div
              key={station.slug}
              className="relative overflow-hidden rounded-2xl border border-dashed border-rail bg-craie-2 p-3 text-left"
            >
              <div className="flex items-start justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-pierre-faint">
                  {playable ? t('collection.sealed') : t('collection.comingSoon')}
                </p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rail text-sm text-pierre-faint">
                  {playable ? <IconLock size={13} /> : '·'}
                </span>
              </div>
              <h2 className="mt-2 font-display text-base font-extrabold leading-tight tracking-tight text-pierre-dim">
                {station.name}
              </h2>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-pierre-faint">
                {playable ? t('collection.reveal') : t('collection.locked')}
              </p>
            </div>
          );
        })}
      </div>

      {active && <ArchiveCard station={active} onClose={() => setActive(null)} />}
    </div>
  );
}

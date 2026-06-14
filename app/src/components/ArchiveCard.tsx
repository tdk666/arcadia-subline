import { pickText, useI18n } from '../i18n';
import type { StationContent } from '../lib/content';

/* ── LE PAYOFF CULTUREL : l'archive comme objet de collection ───────── */
/** Carte d'archive plein écran (parchemin clair, sceau + récit + faits).
 *  Réutilisée par l'écran de résultat ET la collection. */
export function ArchiveCard({ station, onClose }: { station: StationContent; onClose: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-5" onClick={onClose}>
      <div
        className="animate-stamp relative max-h-[82vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-guimard/60 bg-plomb p-6 shadow-[0_16px_44px_rgba(0,0,0,0.35)]"
        style={{ background: 'linear-gradient(165deg, #fbf6ea 0%, #f1ead6 55%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* balayage lumineux de révélation */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="animate-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3f6b4d]">
              {pickText(station.archive.collection, locale)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-pierre-faint">
              {t('archive.number', { n: station.archive.number })} · {pickText(station.archive.era, locale)}
            </p>
          </div>
          {/* sceau */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#3f6b4d]/70 font-display text-xl text-[#3f6b4d]">
            ⚜
          </div>
        </div>

        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-pierre">
          {station.name}
        </h2>
        <p className="mt-1 text-sm italic text-[#3f6b4d]">{pickText(station.story.teaser, locale)}</p>

        <p className="mt-4 text-sm leading-relaxed text-pierre-dim">
          {pickText(station.story.body, locale)}
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {(station.story.facts[locale] ?? station.story.facts.fr).map((f, i) => (
            <li
              key={f}
              className="animate-slide-up flex items-center gap-2.5 rounded-lg border border-guimard/30 bg-guimard/10 px-3 py-2 text-xs text-pierre"
              style={{ animationDelay: `${0.5 + i * 0.15}s` }}
            >
              <span className="text-[#3f6b4d]">◈</span>{f}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-guimard py-3 font-display font-bold text-white active:scale-[0.98]"
        >
          {t('archive.keep')}
        </button>
      </div>
    </div>
  );
}

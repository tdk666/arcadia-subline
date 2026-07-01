import { useNavigate } from 'react-router-dom';
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { pickText, useI18n } from '../i18n';
import { getStationContent } from '../lib/content';
import { useArcadia } from '../store';
import { tap } from '../lib/feedback';
import { IconLock, IconPlay, IconStar } from './icons';

/**
 * FICHE STATION en bottom-sheet — surgit SUR la carte (tout vit au même endroit,
 * fini l'aller-retour vers un écran de ligne). Contenu → on lance un palier
 * directement ; sinon « bientôt ». Lien « détails » pour la fiche complète.
 */
export function StationSheet({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const tiersWon = useArcadia((s) => s.tiersWon[slug]) ?? [];
  const isTierUnlocked = useArcadia((s) => s.isTierUnlocked);
  const content = getStationContent(slug);

  function play(tier: DifficultyTier) {
    tap();
    onClose();
    navigate(`/play/${slug}/${tier}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="animate-slide-up w-full max-w-md rounded-t-2xl border-t border-rail bg-plomb p-5 pb-8 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* plaque émaillée — la signature */}
        <div className="rounded-xl border border-rail bg-[#0a5a9e] px-4 py-2.5 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.85)]">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">{content?.name ?? name}</h2>
        </div>

        {content ? (
          <>
            <p className="mt-2 text-center text-sm italic text-pierre-dim">{pickText(content.game.tagline, locale)}</p>
            <div className="mt-4 flex flex-col gap-2">
              {TIER_ORDER.map((tier) => {
                const unlocked = isTierUnlocked(slug, tier);
                const won = tiersWon.includes(tier);
                const p = content.quests[tier].params as Record<string, number>;
                return (
                  <button
                    key={tier}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => play(tier)}
                    className={`flex items-center justify-between rounded-xl border border-rail bg-craie-2 px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-45 ${unlocked ? 'active:bg-plomb-hi' : ''}`}
                  >
                    <span>
                      <span className="block font-display text-base font-extrabold text-pierre">{t(`station.tiers.${tier}`)}</span>
                      <span className="mt-0.5 block text-[11px] text-pierre-faint">
                        {unlocked ? t(`station.rules.${tier}`, { shots: p.maxShots, pct: p.targetPct, time: p.timeLimitS }) : t('station.tierLocked')}
                      </span>
                    </span>
                    <span className="flex-none">
                      {won
                        ? <span className="text-laiton"><IconStar size={18} /></span>
                        : unlocked
                          ? <span className="text-email"><IconPlay size={18} /></span>
                          : <span className="text-pierre-faint"><IconLock size={17} /></span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { onClose(); navigate(`/station/${slug}`); }}
              className="mt-3 w-full text-center font-mono text-xs text-pierre-dim underline-offset-2 active:underline"
            >
              {t('station.story.title')} ›
            </button>
          </>
        ) : (
          <p className="mt-4 text-center text-sm text-pierre-dim">{t('station.comingSoon')}</p>
        )}
      </div>
    </div>
  );
}

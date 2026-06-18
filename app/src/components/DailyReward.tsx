import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useArcadia } from '../store';
import { haptic } from '../lib/feedback';
import { Button } from './Button';
import { IconFlame } from './icons';

/**
 * CÉLÉBRATION DE SÉRIE — surgit quand l'objectif du jour vient d'être atteint
 * (rewardPending). Le « petit shot » de dopamine quotidien (Duolingo/Candy
 * Crush). Global (monté dans AppLayout) : s'affiche quel que soit l'onglet.
 */
export function DailyReward() {
  const { t } = useI18n();
  const pending = useArcadia((s) => s.daily.rewardPending);
  const streak = useArcadia((s) => s.daily.streak);
  const clear = useArcadia((s) => s.clearDailyReward);

  useEffect(() => {
    if (pending) haptic([40, 60, 80]);
  }, [pending]);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 px-8" onClick={clear}>
      <div
        className="animate-pop w-full max-w-xs rounded-2xl border border-laiton/50 bg-plomb p-6 text-center shadow-[0_16px_44px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="animate-glow mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-vermillon/15 text-vermillon">
          <IconFlame size={36} />
        </span>
        <p className="mt-3 font-display text-2xl font-extrabold text-pierre">{t('daily.reward.title')}</p>
        <p className="mt-1 text-sm text-pierre-dim">{t('daily.reward.body', { n: streak })}</p>
        <Button variant="gold" size="md" className="mt-4" onClick={clear}>
          {t('daily.reward.cta')}
        </Button>
      </div>
    </div>
  );
}

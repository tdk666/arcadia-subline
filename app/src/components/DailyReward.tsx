import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useArcadia } from '../store';
import { haptic } from '../lib/feedback';
import { track } from '../lib/analytics';
import { Button } from './Button';
import { Mascotte } from './Mascotte';
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

  const dismiss = () => { track('daily_reward_claim', { streak }); clear(); };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 px-8" onClick={dismiss}>
      <div
        className="animate-pop w-full max-w-xs rounded-2xl border border-laiton/50 bg-plomb p-6 text-center shadow-[0_16px_44px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="animate-pop relative mx-auto h-28 w-28">
          <Mascotte size={112} className="mx-auto drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]" />
          <span className="animate-glow absolute -right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-vermillon text-white shadow">
            <IconFlame size={18} />
          </span>
        </div>
        <p className="mt-2 font-display text-2xl font-extrabold text-pierre">{t('daily.reward.title')}</p>
        <p className="mt-1 text-sm text-pierre-dim">{t('daily.reward.body', { n: streak })}</p>
        <Button variant="gold" size="md" className="mt-4" onClick={dismiss}>
          {t('daily.reward.cta')}
        </Button>
      </div>
    </div>
  );
}

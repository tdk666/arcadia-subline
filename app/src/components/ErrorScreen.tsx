import { useRouteError } from 'react-router-dom';
import { useI18n } from '../i18n';

/**
 * errorElement des routes : un crash ne montre JAMAIS une stack à l'utilisateur.
 * Mise en scène dans la DA (rame à plomb), reprise en un tap.
 */
export function ErrorScreen() {
  const { t } = useI18n();
  const error = useRouteError();
  // diagnostic développeur uniquement — l'utilisateur voit l'écran soigné
  console.error('[arcadia] route error:', error);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-8 text-center">
      {/* rame stylisée à l'arrêt */}
      <svg width="180" height="70" viewBox="0 0 180 70" aria-hidden>
        <rect x="10" y="14" width="160" height="38" rx="10" fill="#161c25" stroke="#2a3340" strokeWidth="2" />
        <rect x="24" y="24" width="26" height="16" rx="3" fill="#15110c" stroke="#e0964a" strokeWidth="1.5" />
        <rect x="58" y="24" width="26" height="16" rx="3" fill="#15110c" stroke="#e0964a" strokeWidth="1.5" />
        <rect x="92" y="24" width="26" height="16" rx="3" fill="#15110c" stroke="#e0964a" strokeWidth="1.5" />
        <rect x="126" y="24" width="26" height="16" rx="3" fill="#15110c" stroke="#bb2e2a" strokeWidth="1.5" />
        <circle cx="40" cy="58" r="6" fill="#2a3340" />
        <circle cx="140" cy="58" r="6" fill="#2a3340" />
        <line x1="0" y1="66" x2="180" y2="66" stroke="#f2c200" strokeWidth="2.5" />
      </svg>
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-pierre">
          {t('errorScreen.title')}
        </h1>
        <p className="mt-2 text-sm text-pierre-dim">{t('errorScreen.body')}</p>
      </div>
      <a
        href="/"
        className="rounded-xl bg-laiton px-6 py-3 font-display font-bold text-encre active:scale-[0.98]"
      >
        {t('errorScreen.cta')}
      </a>
    </div>
  );
}

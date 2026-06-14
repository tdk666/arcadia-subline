/**
 * SUR-COUCHE D'ORIENTATION — le mini-jeu de démolition se joue en PAYSAGE
 * (terrain 960×600). En portrait, le monde serait écrasé et la visée
 * impossible : on tente screen.orientation.lock('landscape') quand le
 * navigateur l'autorise, sinon on invite élégamment à pivoter le téléphone.
 * Le rendu (canvas) reste monté derrière : dès la rotation, tout reflue.
 */
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useI18n } from '../i18n';

function subscribePortrait(cb: () => void) {
  const mq = window.matchMedia('(orientation: portrait)');
  mq.addEventListener('change', cb);
  window.addEventListener('resize', cb);
  return () => {
    mq.removeEventListener('change', cb);
    window.removeEventListener('resize', cb);
  };
}
const isPortrait = () => window.matchMedia('(orientation: portrait)').matches;

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

export function OrientationGate({ active, children }: { active: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const portrait = useSyncExternalStore(subscribePortrait, isPortrait, () => false);

  // tentative de verrouillage paysage (Android/Chrome ; ignoré ailleurs)
  useEffect(() => {
    if (!active) return;
    const so = screen.orientation as LockableOrientation | undefined;
    so?.lock?.('landscape').catch(() => { /* iOS & desktop : géré par l'overlay */ });
    return () => { try { screen.orientation?.unlock?.(); } catch { /* noop */ } };
  }, [active]);

  return (
    <>
      {children}
      {active && portrait && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-craie/95 px-10 text-center">
          {/* halo ambre de réverbère */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
            style={{ background: 'radial-gradient(60% 80% at 50% 0%, rgba(224,150,74,0.14), transparent 70%)' }}
          />
          <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden className="animate-rotate-hint">
            <rect x="30" y="10" width="26" height="66" rx="6" fill="none" stroke="#c9a227" strokeWidth="2.5" />
            <rect x="35" y="18" width="16" height="46" rx="1.5" fill="#241f18" stroke="#e0964a" strokeWidth="1" />
            <circle cx="43" cy="70" r="2" fill="#c9a227" />
          </svg>
          <div className="relative">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-pierre">
              {t('orient.title')}
            </h2>
            <p className="mt-2 text-sm text-pierre-dim">{t('orient.body')}</p>
          </div>
          {/* flèche de rotation */}
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden className="relative">
            <path d="M14 30 A16 16 0 1 1 28 44" fill="none" stroke="#e3c463" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 24 L14 30 L20 24" fill="none" stroke="#e3c463" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </>
  );
}

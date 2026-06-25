import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';
import { StatusBar } from './StatusBar';
import { DailyReward } from './DailyReward';
import { AchievementToast } from './AchievementToast';
import { ONBOARDING_KEY } from '../lib/ftue';
import { IconNetwork, IconCollection, IconLeague, IconProfile } from './icons';

// FTUE « L'Émergence » : code-splittée (le runtime Rive ne charge qu'à la 1re run)
const Emergence = lazy(() => import('./ftue/Emergence').then((m) => ({ default: m.Emergence })));

/** Filet : si le chunk de l'intro échoue (chunk obsolète après déploiement, réseau),
 *  on ne laisse JAMAIS un écran noir — on bascule sur l'app. */
class IntroBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Après l'intro on atterrit sur LA MÊME carte que l'onglet « Carte » (accueil `/`,
 * NetworkScreen) : fini la double-carte incohérente entre l'intro et la nav.
 * L'accueil met déjà en avant le « Défi du jour » (1-tap) ; Bastille (boss
 * paysage) reste un choix, pas un premier contact imposé. (Playtest Agathe.)
 */
const FIRST_MAP = '/';

function Tab({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
          isActive ? 'text-email' : 'text-pierre-faint active:text-pierre-dim'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY));

  // l'intro peut être rejouée depuis le profil
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener('arcadia:replay-intro', handler);
    return () => window.removeEventListener('arcadia:replay-intro', handler);
  }, []);

  return (
    <div className="safe-top mx-auto flex h-full max-w-md flex-col">
      {backend.mode === 'demo' && (
        <div
          className="bg-vermillon/15 px-4 py-1.5 text-center font-mono text-[11px] text-vermillon"
          title={t('demo.detail')}
        >
          {t('demo.banner')}
        </div>
      )}
      <StatusBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="safe-bottom flex border-t border-rail bg-craie-2">
        <Tab to="/" label={t('nav.network')} icon={<IconNetwork size={22} />} />
        <Tab to="/collection" label={t('nav.collection')} icon={<IconCollection size={22} />} />
        <Tab to="/leaderboard" label={t('nav.leaderboard')} icon={<IconLeague size={22} />} />
        <Tab to="/profile" label={t('nav.profile')} icon={<IconProfile size={22} />} />
      </nav>
      <DailyReward />
      <AchievementToast />
      {showOnboarding && (
        <IntroBoundary onFail={() => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ } setShowOnboarding(false); navigate(FIRST_MAP); }}>
          <Suspense fallback={<div className="fixed inset-0 z-[60]" style={{ background: 'var(--color-acier)' }} />}>
            <Emergence
              onDone={() => setShowOnboarding(false)}
              onStart={() => {
                setShowOnboarding(false);
                // on atterrit sur l'accueil (même carte que la nav), pas dans le boss
                navigate(FIRST_MAP);
              }}
            />
          </Suspense>
        </IntroBoundary>
      )}
    </div>
  );
}

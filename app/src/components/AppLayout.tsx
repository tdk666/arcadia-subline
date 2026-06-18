import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';
import { StatusBar } from './StatusBar';
import { DailyReward } from './DailyReward';
import { Onboarding, ONBOARDING_KEY } from './Onboarding';
import { isPlayable } from '../lib/content';
import { IconNetwork, IconCollection, IconLeague, IconProfile } from './icons';

/** Station du tout premier défi guidé (FTUE « apprendre en jouant »). */
const FIRST_GAME = '/play/bastille/bronze';

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
      {showOnboarding && (
        <Onboarding
          onDone={() => setShowOnboarding(false)}
          onStart={() => {
            setShowOnboarding(false);
            // apprendre en jouant : on enchaîne direct sur le 1er défi guidé
            if (isPlayable('bastille')) navigate(FIRST_GAME);
          }}
        />
      )}
    </div>
  );
}

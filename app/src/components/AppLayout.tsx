import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';
import { StatusBar } from './StatusBar';
import { IconNetwork, IconCollection, IconLeague, IconProfile } from './icons';

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
    </div>
  );
}

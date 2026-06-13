import { NavLink, Outlet } from 'react-router-dom';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';

function Tab({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
          isActive ? 'text-laiton' : 'text-pierre-faint active:text-pierre-dim'
        }`
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {backend.mode === 'demo' && (
        <div
          className="safe-top bg-vermillon/15 px-4 py-1.5 text-center font-mono text-[11px] text-vermillon"
          title={t('demo.detail')}
        >
          {t('demo.banner')}
        </div>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="safe-bottom flex border-t border-rail bg-encre-2">
        <Tab to="/" label={t('nav.map')} icon="◉" />
        <Tab to="/leaderboard" label={t('nav.leaderboard')} icon="♛" />
        <Tab to="/profile" label={t('nav.profile')} icon="◈" />
      </nav>
    </div>
  );
}

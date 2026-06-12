import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { backend } from './lib/backend';
import { useArcadia } from './store';
import { AppLayout } from './components/AppLayout';
import { ErrorScreen } from './components/ErrorScreen';
import { Onboarding, ONBOARDING_KEY } from './components/Onboarding';
import { LineMapScreen } from './screens/LineMapScreen';
import { StationScreen } from './screens/StationScreen';
import { GameScreen } from './screens/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <ErrorScreen />,
    children: [
      { path: '/', element: <LineMapScreen /> },
      { path: '/station/:slug', element: <StationScreen /> },
      { path: '/leaderboard', element: <LeaderboardScreen /> },
      { path: '/profile', element: <ProfileScreen /> },
    ],
  },
  // le jeu est plein écran, hors layout (pas de barre de navigation)
  { path: '/play/:slug/:tier', element: <GameScreen />, errorElement: <ErrorScreen /> },
]);

export default function App() {
  const setUser = useArcadia((s) => s.setUser);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY),
  );

  useEffect(() => {
    void backend.getUser().then(setUser);
    return backend.onAuthChange(setUser);
  }, [setUser]);

  // l'intro peut être revue depuis le profil
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener('arcadia:replay-intro', handler);
    return () => window.removeEventListener('arcadia:replay-intro', handler);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    </>
  );
}

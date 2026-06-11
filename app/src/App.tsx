import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { backend } from './lib/backend';
import { useArcadia } from './store';
import { AppLayout } from './components/AppLayout';
import { LineMapScreen } from './screens/LineMapScreen';
import { StationScreen } from './screens/StationScreen';
import { GameScreen } from './screens/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LineMapScreen /> },
      { path: '/station/:slug', element: <StationScreen /> },
      { path: '/leaderboard', element: <LeaderboardScreen /> },
      { path: '/profile', element: <ProfileScreen /> },
    ],
  },
  // le jeu est plein écran, hors layout (pas de barre de navigation)
  { path: '/play/:slug/:tier', element: <GameScreen /> },
]);

export default function App() {
  const setUser = useArcadia((s) => s.setUser);

  useEffect(() => {
    void backend.getUser().then(setUser);
    return backend.onAuthChange(setUser);
  }, [setUser]);

  return <RouterProvider router={router} />;
}

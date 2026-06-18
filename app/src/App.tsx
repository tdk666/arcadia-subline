import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { backend } from './lib/backend';
import { useArcadia } from './store';
import { AppLayout } from './components/AppLayout';
import { ErrorScreen } from './components/ErrorScreen';
import { NetworkScreen } from './screens/NetworkScreen';
import { LineMapScreen } from './screens/LineMapScreen';
import { StationScreen } from './screens/StationScreen';
import { GameScreen } from './screens/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CollectionScreen } from './screens/CollectionScreen';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <ErrorScreen />,
    children: [
      { path: '/', element: <NetworkScreen /> },
      { path: '/line/:code', element: <LineMapScreen /> },
      { path: '/station/:slug', element: <StationScreen /> },
      { path: '/collection', element: <CollectionScreen /> },
      { path: '/leaderboard', element: <LeaderboardScreen /> },
      { path: '/profile', element: <ProfileScreen /> },
    ],
  },
  // le jeu est plein écran, hors layout (pas de barre de navigation)
  { path: '/play/:slug/:tier', element: <GameScreen />, errorElement: <ErrorScreen /> },
]);

export default function App() {
  const setUser = useArcadia((s) => s.setUser);

  useEffect(() => {
    void backend.getUser().then(setUser);
    return backend.onAuthChange(setUser);
  }, [setUser]);

  // L'onboarding vit DANS le routeur (cf. AppLayout) pour pouvoir enchaîner sur
  // la 1re partie guidée (apprendre en jouant).
  return <RouterProvider router={router} />;
}

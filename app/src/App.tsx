import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { backend } from './lib/backend';
import { track } from './lib/analytics';
import { useArcadia } from './store';
import { AppLayout } from './components/AppLayout';
import { ErrorScreen } from './components/ErrorScreen';
import { NetworkScreen } from './screens/NetworkScreen';
import { LineMapScreen } from './screens/LineMapScreen';
import { BoutiqueScreen } from './screens/BoutiqueScreen';
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
      { path: '/boutique', element: <BoutiqueScreen /> },
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

  // début de session (durée déduite côté analyse via server_ts du flush)
  useEffect(() => { track('session_start'); }, []);

  // L'onboarding vit DANS le routeur (cf. AppLayout) pour pouvoir enchaîner sur
  // la 1re partie guidée (apprendre en jouant).
  return <RouterProvider router={router} />;
}

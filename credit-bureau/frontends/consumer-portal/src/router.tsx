import { createBrowserRouter } from 'react-router-dom';
import { ConsumerLayout } from './components/ConsumerLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DisputesPage } from './pages/DisputesPage';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ConsumerLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'disputes', element: <DisputesPage /> },
      { path: 'profile', element: <ProfilePage /> }
    ]
  }
]);

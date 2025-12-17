import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ObligationsPage } from './pages/ObligationsPage';
import { DisputesPage } from './pages/DisputesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout title="regulator portal" />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'obligations', element: <ObligationsPage /> },
      { path: 'disputes', element: <DisputesPage /> }
    ]
  }
]);

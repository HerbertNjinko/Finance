import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ObligationsPage } from './pages/ObligationsPage';
import { DisputesPage } from './pages/DisputesPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RequireAuth } from './components/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout title="regulator portal" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'obligations', element: <ObligationsPage /> },
      { path: 'disputes', element: <DisputesPage /> },
      { path: 'institutions', element: <InstitutionsPage /> },
      { path: 'users', element: <UsersPage /> }
    ]
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> }
]);

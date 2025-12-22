import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { tokens, logout } = useAuth();
  const location = useLocation();
  if (!tokens?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (tokens.role !== 'regulator') {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

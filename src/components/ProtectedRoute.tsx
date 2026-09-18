import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { session, isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (session?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Redirect auth pages away once already logged in. */
export function AuthRoute() {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
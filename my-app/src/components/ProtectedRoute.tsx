import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserType } from '../context/AuthContext';
import { portalPathFor } from '../utils/portalRouting';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, only this user type may access the route. */
  requiredRole?: UserType;
}

const LOGIN_PATH = '/login';

/**
 * Gates a route on authentication and (optionally) user type. While auth is
 * resolving it shows a spinner; an unauthenticated user is sent to the matching
 * login; a logged-in user on the wrong portal is redirected to their own.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <LoaderCircle size={16} className="spin" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  if (requiredRole && userType !== requiredRole) {
    // Logged in but wrong role: send to their own portal, or home if profile lookup failed.
    return <Navigate to={userType ? portalPathFor(userType) : '/'} replace />;
  }

  return <>{children}</>;
}

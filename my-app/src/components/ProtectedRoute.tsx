import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserType } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, only this user type may access the route. */
  requiredRole?: UserType;
}

const loginPathFor = (role?: UserType): string =>
  role === 'sitter' ? '/login' : role === 'customer' ? '/customer-login' : '/portal';

const portalPathFor = (role: UserType): string =>
  role === 'sitter' ? '/sitter-portal' : '/user-portal';

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
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPathFor(requiredRole)} replace />;
  }

  if (requiredRole && userType !== requiredRole) {
    // Logged in but wrong role: send to their own portal, or the chooser if unknown.
    return <Navigate to={userType ? portalPathFor(userType) : '/portal'} replace />;
  }

  return <>{children}</>;
}

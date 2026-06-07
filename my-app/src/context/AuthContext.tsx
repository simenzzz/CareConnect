import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import authService from '../services/authService';

export type UserType = 'customer' | 'sitter';

interface AuthContextValue {
  user: User | null;
  userType: UserType | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Single source of auth truth for the app. Subscribes to Firebase auth ONCE,
 * resolves the app user's type from `/api/auth/profile`, and exposes it via
 * `useAuth()`. Replaces the ad-hoc `onAuthStateChanged` subscriptions that each
 * component previously maintained.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const result = await authService.getProfile();
    if (result.success && result.data?.user) {
      setUserType((result.data.user.userType as UserType) ?? null);
      setProfile(result.data.profile ?? null);
    } else {
      setUserType(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // A user is present but their type isn't known until the profile loads.
        // Re-arm loading so route guards wait for `userType` instead of evaluating
        // the role check against a transient null (which would misroute on login).
        setIsLoading(true);
        await loadProfile();
      } else {
        setUserType(null);
        setProfile(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setUserType(null);
    setProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ user, userType, profile, isLoading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

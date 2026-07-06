import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { env } from '../config/env';
import { apiRequest } from './apiClient';

export interface SignupData {
  email: string;
  password: string;
  userType: 'customer' | 'sitter';
  profileData: Record<string, unknown>;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ApiResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
}

const NETWORK_ERROR = 'Unable to connect to the server. Please check your connection and try again.';

// Map a Firebase Auth error (or a thrown Error) to a user-friendly message.
const friendlyAuthError = (error: unknown, fallback: string, codeMap: Record<string, string>): string => {
  const code = (error as { code?: string })?.code;
  if (code && codeMap[code]) {
    return codeMap[code];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

class AuthService {
  async createFirebaseAccount(email: string, password: string): Promise<{ success: true; user: User } | { success: false; error: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return {
        success: false,
        error: friendlyAuthError(error, 'Registration failed. Please try again.', {
          'auth/email-already-in-use':
            'This email address is already in use. Please use a different email or try logging in.',
          'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/operation-not-allowed': 'Account creation is currently unavailable. Please contact support.',
          'auth/network-request-failed': 'Network error. Please check your internet connection.',
        }),
      };
    }
  }

  async deleteCurrentFirebaseUser(): Promise<void> {
    await auth.currentUser?.delete().catch(() => undefined);
  }

  async registerProfile(user: User, userType: 'customer' | 'sitter', profileData: Record<string, unknown>): Promise<ApiResponse> {
    const idToken = await user.getIdToken();
    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, userType, profileData }),
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }
    return { success: true, data: result };
  }

  // Create a Firebase account, then register the profile with our API.
  async signup(signupData: SignupData): Promise<ApiResponse> {
    let createdUser: User | null = null;
    try {
      const account = await this.createFirebaseAccount(signupData.email, signupData.password);
      if (!account.success) {
        throw new Error(account.error);
      }
      createdUser = account.user;

      // Registration carries the token in the body (the app user doesn't exist yet),
      // so this call is intentionally unauthenticated at the client layer.
      return await this.registerProfile(createdUser, signupData.userType, signupData.profileData);
    } catch (error) {
      // Any failure after the Firebase account was created (network OR a backend
      // rejection) must roll it back, so we don't leave an orphaned account that
      // can authenticate but has no app profile.
      if (createdUser) {
        await createdUser.delete().catch(() => undefined);
      }
      return {
        success: false,
        error: friendlyAuthError(error, 'Registration failed. Please try again.', {
          'auth/email-already-in-use':
            'This email address is already in use. Please use a different email or try logging in.',
          'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/operation-not-allowed': 'Account creation is currently unavailable. Please contact support.',
          'auth/network-request-failed': 'Network error. Please check your internet connection.',
        }),
      };
    }
  }

  // Sign in with Firebase, then resolve the profile from our API.
  async login(loginData: LoginData): Promise<ApiResponse> {
    try {
      await setPersistence(auth, loginData.rememberMe ? browserLocalPersistence : browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      const idToken = await userCredential.user.getIdToken();

      let response: Response;
      try {
        response = await fetch(`${env.apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({}),
        });
      } catch {
        await signOut(auth);
        throw new Error(NETWORK_ERROR);
      }

      const result = await response.json();
      if (!response.ok) {
        // Don't leave the user signed into Firebase if our backend rejected them.
        await signOut(auth);
        throw new Error(result.error || 'Login failed');
      }
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: friendlyAuthError(error, 'Login failed. Please try again.', {
          'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
          'auth/wrong-password': 'Invalid email or password. Please check your credentials and try again.',
          'auth/user-not-found': 'Invalid email or password. Please check your credentials and try again.',
          'auth/invalid-email': 'Invalid email address format.',
          'auth/user-disabled': 'This account has been disabled. Please contact support.',
          'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
          'auth/network-request-failed': 'Network error. Please check your internet connection.',
        }),
      };
    }
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const result = await apiRequest('/auth/profile');
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get profile' };
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async updateSitterDocuments(cvUrl: string, identityDocumentUrl: string): Promise<ApiResponse> {
    try {
      const result = await apiRequest('/auth/sitter/documents', {
        method: 'PUT',
        body: { cvUrl, identityDocumentUrl },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update documents' };
    }
  }

  async updateProfile(profileData: Record<string, unknown>): Promise<ApiResponse> {
    try {
      const result = await apiRequest('/auth/profile', { method: 'PUT', body: { profileData } });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' };
    }
  }
}

const authService = new AuthService();
export default authService;
export { authService };

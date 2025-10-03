import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000/api';

export interface SignupData {
  email: string;
  password: string;
  userType: 'customer' | 'sitter';
  profileData: any;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AuthService {
  // Create Firebase account and register with our API
  async signup(signupData: SignupData): Promise<ApiResponse> {
    try {
      console.log('🚀 Starting signup process...');
      
      // Step 1: Create Firebase account
      console.log('1️⃣ Creating Firebase account...');
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        signupData.email, 
        signupData.password
      );
      
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      console.log('✅ Firebase account created:', user.uid);
      
      // Step 2: Register with our API
      console.log('2️⃣ Registering with our API...');
      console.log('🔍 authService - signupData.profileData:', signupData.profileData);
      console.log('🔍 authService - children in profileData:', signupData.profileData.children);
      console.log('🔍 authService - pets in profileData:', signupData.profileData.pets);
      
      const requestBody = {
        idToken,
        userType: signupData.userType,
        profileData: signupData.profileData
      };
      
      console.log('🔍 authService - Full request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      console.log('✅ API registration successful:', result);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Signup failed:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Signup failed';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Login with Firebase and get profile from our API
  async login(loginData: LoginData): Promise<ApiResponse> {
    try {
      console.log('🚀 Starting login process...');
      
      // Step 1: Sign in with Firebase
      console.log('1️⃣ Signing in with Firebase...');
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        loginData.email, 
        loginData.password
      );
      
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      console.log('✅ Firebase login successful:', user.uid);
      
      // Step 2: Get profile from our API
      console.log('2️⃣ Getting profile from API...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      
      console.log('✅ API login successful:', result);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }
  
  // Get current user profile
  async getProfile(): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get profile');
      }
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Get profile failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get profile'
      };
    }
  }
  
  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  }
  
  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
}

export const authService = new AuthService();

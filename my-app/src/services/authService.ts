import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
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
  expectedUserType?: 'customer' | 'sitter';
  rememberMe?: boolean;
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
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
      } catch (fetchError) {
        // Network error - backend is not running or unreachable
        // Delete the Firebase account we just created since registration failed
        if (user) {
          await user.delete();
        }
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
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
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already in use. Please use a different email or try logging in.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Account creation is currently unavailable. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = error.message || 'Registration failed. Please try again.';
        }
      } else if (error.message) {
        // If it's not a Firebase error, use the message directly (like backend validation errors)
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
      
      // Step 0: Set persistence based on "Remember Me"
      const persistence = loginData.rememberMe 
        ? browserLocalPersistence  // Stay logged in across browser sessions
        : browserSessionPersistence; // Logout when browser closes
      
      console.log(`🔐 Setting persistence: ${loginData.rememberMe ? 'LOCAL (Remember Me)' : 'SESSION (This session only)'}`);
      await setPersistence(auth, persistence);
      
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
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            expectedUserType: loginData.expectedUserType
          })
        });
      } catch (fetchError) {
        // Network error - backend is not running or unreachable
        await signOut(auth);
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        // Sign out from Firebase if backend validation fails
        await signOut(auth);
        throw new Error(result.error || 'Login failed');
      }
      
      console.log('✅ API login successful:', result);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = error.message || 'Login failed. Please try again.';
        }
      } else if (error.message) {
        // If it's not a Firebase error, use the message directly (like backend validation errors)
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
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
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
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
  
  // Update sitter documents
  async updateSitterDocuments(cvUrl: string, identityDocumentUrl: string): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const idToken = await user.getIdToken();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/sitter/documents`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            cvUrl,
            identityDocumentUrl
          })
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update documents');
      }
      
      console.log('✅ Documents updated successfully');
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Update documents failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update documents'
      };
    }
  }
  
  // Update user profile
  async updateProfile(profileData: any): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const idToken = await user.getIdToken();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ profileData })
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      console.log('✅ Profile updated successfully');
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ Update profile failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  }
}

const authService = new AuthService();
export default authService;
export { authService };

import AuthService from './auth';

const API_BASE_URL = 'http://localhost:5000/api';

// API service class
export class ApiService {
  // Generic API request method
  private static async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if user is logged in
    try {
      const token = await AuthService.getIdToken();
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      // User not logged in, continue without token
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`❌ API request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Register user
  static async register(idToken: string, userType: 'customer' | 'sitter', profileData: any): Promise<any> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        userType,
        profileData,
      }),
    });
  }

  // Login user
  static async login(): Promise<any> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
    });
  }

  // Get user profile
  static async getProfile(): Promise<any> {
    return this.makeRequest('/auth/profile', {
      method: 'GET',
    });
  }

  // Update user profile
  static async updateProfile(profileData: any): Promise<any> {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ profileData }),
    });
  }

  // Health check
  static async healthCheck(): Promise<any> {
    return fetch('http://localhost:5000/health')
      .then(response => response.json());
  }
}

export default ApiService;

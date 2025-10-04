const API_BASE_URL = 'http://localhost:5000/api';

export interface Sitter {
  id: number;
  fullName: string;
  area: string;
  city: string;
  phone: string;
  hoursPerWeek: string;
  sitterType: 'B' | 'P' | 'T'; // B = Baby Sitter, P = Pet Sitter, T = Both
  description: string | null;
  rating: number;
  experience: string;
  skills: string[];
  createdAt: string;
}

export interface FetchSittersResponse {
  success: boolean;
  data?: {
    petSitters: Sitter[];
    babySitters: Sitter[];
    allSitters: Sitter[];
  };
  error?: string;
}

class SittersService {
  // Fetch all sitters
  async fetchSitters(): Promise<FetchSittersResponse> {
    try {
      console.log('📋 Fetching sitters from API...');
      
      const response = await fetch(`${API_BASE_URL}/sitters/fetchSitters`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sitters');
      }
      
      console.log('✅ Sitters fetched successfully:', result.data);
      
      return {
        success: true,
        data: result.data
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching sitters:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch sitters'
      };
    }
  }
  
  // Search sitters by name
  async searchSittersByName(name: string): Promise<{ success: boolean; data?: Sitter[]; error?: string; message?: string }> {
    try {
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          error: 'Search name is required'
        };
      }
      
      console.log(`🔍 Searching for sitters with name: "${name}"...`);
      
      const response = await fetch(`${API_BASE_URL}/sitters/searchByName?name=${encodeURIComponent(name)}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to search sitters');
      }
      
      console.log('✅ Sitters found:', result.data?.length || 0);
      
      return {
        success: true,
        data: result.data,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Error searching sitters:', error);
      return {
        success: false,
        error: error.message || 'Failed to search sitters'
      };
    }
  }
}

const sittersService = new SittersService();
export default sittersService;
export { sittersService };


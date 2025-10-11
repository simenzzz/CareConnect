import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000/api';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class CustomerService {
  private async getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    const idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };
  }

  // ==================== CHILDREN MANAGEMENT ====================

  async getChildren(): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/children`, {
          method: 'GET',
          headers
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch children');
      }
      
      return {
        success: true,
        data: result.children
      };
      
    } catch (error: any) {
      console.error('❌ Get children failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch children'
      };
    }
  }

  async addChild(childData: { name: string; age: string; hobbies?: string; schoolType: string; specialNeeds?: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/children`, {
          method: 'POST',
          headers,
          body: JSON.stringify(childData)
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add child');
      }
      
      return {
        success: true,
        data: result.child,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Add child failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to add child'
      };
    }
  }

  async updateChild(childId: number, childData: { name: string; age: string; hobbies?: string; schoolType: string; specialNeeds?: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/children/${childId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(childData)
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update child');
      }
      
      return {
        success: true,
        data: result.child,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Update child failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update child'
      };
    }
  }

  async deleteChild(childId: number): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/children/${childId}`, {
          method: 'DELETE',
          headers
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete child');
      }
      
      return {
        success: true,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Delete child failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete child'
      };
    }
  }

  // ==================== PETS MANAGEMENT ====================

  async getPets(): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/pets`, {
          method: 'GET',
          headers
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pets');
      }
      
      return {
        success: true,
        data: result.pets
      };
      
    } catch (error: any) {
      console.error('❌ Get pets failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch pets'
      };
    }
  }

  async addPet(petData: { name: string; age?: string; type: string; breed?: string; personality?: string; careInstructions?: string; specialNeeds?: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/pets`, {
          method: 'POST',
          headers,
          body: JSON.stringify(petData)
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add pet');
      }
      
      return {
        success: true,
        data: result.pet,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Add pet failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to add pet'
      };
    }
  }

  async updatePet(petId: number, petData: { name: string; age?: string; type: string; breed?: string; personality?: string; careInstructions?: string; specialNeeds?: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/pets/${petId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(petData)
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update pet');
      }
      
      return {
        success: true,
        data: result.pet,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Update pet failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update pet'
      };
    }
  }

  async deletePet(petId: number): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/pets/${petId}`, {
          method: 'DELETE',
          headers
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete pet');
      }
      
      return {
        success: true,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('❌ Delete pet failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete pet'
      };
    }
  }
}

const customerService = new CustomerService();
export default customerService;
export { customerService };


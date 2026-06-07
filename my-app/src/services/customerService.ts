import { apiRequest } from './apiClient';

interface ApiResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  message?: string;
}

interface ChildInput {
  name: string;
  age: string;
  hobbies?: string;
  schoolType: string;
  specialNeeds?: string;
}

interface PetInput {
  name: string;
  age?: string;
  type: string;
  breed?: string;
  personality?: string;
  careInstructions?: string;
  specialNeeds?: string;
}

const toError = (error: unknown, fallback: string): ApiResponse => ({
  success: false,
  error: error instanceof Error ? error.message : fallback,
});

class CustomerService {
  // ==================== CHILDREN ====================

  async getChildren(): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ children: unknown }>('/auth/children');
      return { success: true, data: result.children };
    } catch (error) {
      return toError(error, 'Failed to fetch children');
    }
  }

  async addChild(childData: ChildInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ child: unknown; message?: string }>('/auth/children', {
        method: 'POST',
        body: childData,
      });
      return { success: true, data: result.child, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to add child');
    }
  }

  async updateChild(childId: number, childData: ChildInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ child: unknown; message?: string }>(`/auth/children/${childId}`, {
        method: 'PUT',
        body: childData,
      });
      return { success: true, data: result.child, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to update child');
    }
  }

  async deleteChild(childId: number): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ message?: string }>(`/auth/children/${childId}`, { method: 'DELETE' });
      return { success: true, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to delete child');
    }
  }

  // ==================== PETS ====================

  async getPets(): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ pets: unknown }>('/auth/pets');
      return { success: true, data: result.pets };
    } catch (error) {
      return toError(error, 'Failed to fetch pets');
    }
  }

  async addPet(petData: PetInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ pet: unknown; message?: string }>('/auth/pets', {
        method: 'POST',
        body: petData,
      });
      return { success: true, data: result.pet, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to add pet');
    }
  }

  async updatePet(petId: number, petData: PetInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ pet: unknown; message?: string }>(`/auth/pets/${petId}`, {
        method: 'PUT',
        body: petData,
      });
      return { success: true, data: result.pet, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to update pet');
    }
  }

  async deletePet(petId: number): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ message?: string }>(`/auth/pets/${petId}`, { method: 'DELETE' });
      return { success: true, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to delete pet');
    }
  }
}

const customerService = new CustomerService();
export default customerService;
export { customerService };

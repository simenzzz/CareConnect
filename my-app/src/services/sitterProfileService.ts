import { apiRequest } from './apiClient';

export interface AvailabilitySlot {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const toError = <T = unknown>(error: unknown, fallback: string): ApiResponse<T> => ({
  success: false,
  error: error instanceof Error ? error.message : fallback,
});

class SitterProfileService {
  async getAvailability(): Promise<ApiResponse<AvailabilitySlot[]>> {
    try {
      const result = await apiRequest<{ slots: AvailabilitySlot[] }>('/auth/sitter/availability');
      return { success: true, data: result.slots };
    } catch (error) {
      return toError(error, 'Failed to fetch availability');
    }
  }

  async updateAvailability(slots: AvailabilitySlot[]): Promise<ApiResponse<AvailabilitySlot[]>> {
    try {
      const result = await apiRequest<{ slots: AvailabilitySlot[] }>('/auth/sitter/availability', {
        method: 'PUT',
        body: { slots },
      });
      return { success: true, data: result.slots };
    } catch (error) {
      return toError(error, 'Failed to update availability');
    }
  }
}

const sitterProfileService = new SitterProfileService();
export default sitterProfileService;

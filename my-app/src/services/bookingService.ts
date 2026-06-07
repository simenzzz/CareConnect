import { apiRequest } from './apiClient';

const API_PATH = '/bookings';

export interface CreateBookingData {
  sitterId: number;
  locationId: number;
  bookingFrom: string;
  bookingTo: string;
  paymentMethod: string | null;
  priceUsd: number;
  discount: number;
  additionalNotes: string | null;
  typeOfBooking: 'PET' | 'CHILD';
  petId?: number;
  childId?: number;
}

interface ApiResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
}

const toError = (error: unknown, fallback: string): ApiResponse => ({
  success: false,
  error: error instanceof Error ? error.message : fallback,
});

class BookingService {
  async createBooking(bookingData: CreateBookingData): Promise<ApiResponse> {
    try {
      const result = await apiRequest(API_PATH, { method: 'POST', body: bookingData });
      return { success: true, data: result };
    } catch (error) {
      return toError(error, 'Failed to create booking');
    }
  }

  async getPetBookings(): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ bookings: unknown }>(`${API_PATH}/pets`);
      return { success: true, data: result.bookings };
    } catch (error) {
      return toError(error, 'Failed to fetch pet bookings');
    }
  }

  async getChildBookings(): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ bookings: unknown }>(`${API_PATH}/children`);
      return { success: true, data: result.bookings };
    } catch (error) {
      return toError(error, 'Failed to fetch child bookings');
    }
  }
}

const bookingService = new BookingService();
export default bookingService;

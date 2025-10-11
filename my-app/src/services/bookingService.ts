import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000/api';

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
  data?: any;
  error?: string;
}

class BookingService {
  async createBooking(bookingData: CreateBookingData): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(bookingData)
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      console.log('✅ Booking created successfully:', result);

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Create booking failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create booking'
      };
    }
  }

  async getPetBookings(): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/bookings/pets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pet bookings');
      }

      return {
        success: true,
        data: result.bookings
      };

    } catch (error: any) {
      console.error('❌ Fetch pet bookings failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch pet bookings'
      };
    }
  }

  async getChildBookings(): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/bookings/children`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch child bookings');
      }

      return {
        success: true,
        data: result.bookings
      };

    } catch (error: any) {
      console.error('❌ Fetch child bookings failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch child bookings'
      };
    }
  }
}

const bookingService = new BookingService();
export default bookingService;


import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000/api';

export interface Location {
  id?: number;
  customer_id?: number;
  location_name: string;
  address_name?: string;
  street_name?: string;
  building_name?: string;
  floor?: string;
  address_line: string;
  area: string;
  city: string;
  postal_code?: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class LocationService {
  async getLocations(): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/locations`, {
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
        throw new Error(result.error || 'Failed to fetch locations');
      }

      return {
        success: true,
        data: result.locations
      };

    } catch (error: any) {
      console.error('❌ Fetch locations failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch locations'
      };
    }
  }

  async addLocation(locationData: Omit<Location, 'id' | 'customer_id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            locationName: locationData.location_name,
            addressName: locationData.address_name,
            streetName: locationData.street_name,
            buildingName: locationData.building_name,
            floor: locationData.floor,
            addressLine: locationData.address_line,
            area: locationData.area,
            city: locationData.city,
            postalCode: locationData.postal_code,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            isDefault: locationData.is_default
          })
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add location');
      }

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Add location failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to add location'
      };
    }
  }

  async updateLocation(locationId: number, locationData: Omit<Location, 'id' | 'customer_id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/locations/${locationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            locationName: locationData.location_name,
            addressName: locationData.address_name,
            streetName: locationData.street_name,
            buildingName: locationData.building_name,
            floor: locationData.floor,
            addressLine: locationData.address_line,
            area: locationData.area,
            city: locationData.city,
            postalCode: locationData.postal_code,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            isDefault: locationData.is_default
          })
        });
      } catch (fetchError) {
        throw new Error('Unable to connect to server. Please make sure the backend server is running on port 5000.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update location');
      }

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Update location failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update location'
      };
    }
  }

  async deleteLocation(locationId: number): Promise<ApiResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const idToken = await user.getIdToken();

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/locations/${locationId}`, {
          method: 'DELETE',
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
        throw new Error(result.error || 'Failed to delete location');
      }

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Delete location failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete location'
      };
    }
  }
}

const locationService = new LocationService();
export default locationService;


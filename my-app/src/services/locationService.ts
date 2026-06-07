import { apiRequest } from './apiClient';

const API_PATH = '/auth/locations';

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

type LocationInput = Omit<Location, 'id' | 'customer_id' | 'created_at' | 'updated_at' | 'is_active'>;

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

// The API expects camelCase keys; the client model uses snake_case.
const toApiBody = (location: LocationInput) => ({
  locationName: location.location_name,
  addressName: location.address_name,
  streetName: location.street_name,
  buildingName: location.building_name,
  floor: location.floor,
  addressLine: location.address_line,
  area: location.area,
  city: location.city,
  postalCode: location.postal_code,
  latitude: location.latitude,
  longitude: location.longitude,
  isDefault: location.is_default,
});

class LocationService {
  async getLocations(): Promise<ApiResponse> {
    try {
      const result = await apiRequest<{ locations: unknown }>(API_PATH);
      return { success: true, data: result.locations };
    } catch (error) {
      return toError(error, 'Failed to fetch locations');
    }
  }

  async addLocation(locationData: LocationInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest(API_PATH, { method: 'POST', body: toApiBody(locationData) });
      return { success: true, data: result };
    } catch (error) {
      return toError(error, 'Failed to add location');
    }
  }

  async updateLocation(locationId: number, locationData: LocationInput): Promise<ApiResponse> {
    try {
      const result = await apiRequest(`${API_PATH}/${locationId}`, { method: 'PUT', body: toApiBody(locationData) });
      return { success: true, data: result };
    } catch (error) {
      return toError(error, 'Failed to update location');
    }
  }

  async deleteLocation(locationId: number): Promise<ApiResponse> {
    try {
      const result = await apiRequest(`${API_PATH}/${locationId}`, { method: 'DELETE' });
      return { success: true, data: result };
    } catch (error) {
      return toError(error, 'Failed to delete location');
    }
  }
}

const locationService = new LocationService();
export default locationService;

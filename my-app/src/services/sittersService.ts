import { apiRequest } from './apiClient';

export interface Sitter {
  id: number;
  fullName: string;
  area: string;
  city: string;
  hoursPerWeek: string;
  sitterType: 'B' | 'P' | 'T'; // B = Baby Sitter, P = Pet Sitter, T = Both
  description: string | null;
  profileImageUrl: string;
  rating: number;
  experience: string;
  skills: string[];
  createdAt: string;
}

export interface SitterSuggestion extends Sitter {
  matchScore: number;
  matchReasons: string[];
  matchEventId?: number;
}

interface SittersData {
  petSitters: Sitter[];
  babySitters: Sitter[];
  allSitters: Sitter[];
}

export interface FetchSittersResponse {
  success: boolean;
  data?: SittersData;
  error?: string;
}

const toError = (error: unknown, fallback: string): { success: false; error: string } => ({
  success: false,
  error: error instanceof Error ? error.message : fallback,
});

class SittersService {
  async fetchSitters(): Promise<FetchSittersResponse> {
    try {
      const result = await apiRequest<{ data: SittersData }>('/sitters/fetchSitters', {
        auth: false,
      });
      return { success: true, data: result.data };
    } catch (error) {
      return toError(error, 'Failed to fetch sitters');
    }
  }

  async searchSittersByName(
    name: string,
  ): Promise<{ success: boolean; data?: Sitter[]; error?: string; message?: string }> {
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Search name is required' };
    }
    try {
      const result = await apiRequest<{ data: Sitter[]; message?: string }>(
        `/sitters/searchByName?name=${encodeURIComponent(name)}`,
        { auth: false },
      );
      return { success: true, data: result.data, message: result.message };
    } catch (error) {
      return toError(error, 'Failed to search sitters');
    }
  }

  async fetchSuggestions(params: {
    typeOfBooking: 'PET' | 'CHILD';
    locationId: number;
    bookingFrom: string;
    bookingTo: string;
    childrenIds?: number[];
    petIds?: number[];
    limit?: number;
  }): Promise<{ success: boolean; data?: SitterSuggestion[]; error?: string }> {
    try {
      const search = new URLSearchParams({
        typeOfBooking: params.typeOfBooking,
        locationId: String(params.locationId),
        bookingFrom: params.bookingFrom,
        bookingTo: params.bookingTo,
        limit: String(params.limit ?? 10),
      });
      if (params.childrenIds?.length) search.set('childrenIds', params.childrenIds.join(','));
      if (params.petIds?.length) search.set('petIds', params.petIds.join(','));
      const result = await apiRequest<{ data: SitterSuggestion[] }>(`/bookings/suggestions?${search.toString()}`);
      return { success: true, data: result.data };
    } catch (error) {
      return toError(error, 'Failed to fetch suggestions');
    }
  }
}

const sittersService = new SittersService();
export default sittersService;

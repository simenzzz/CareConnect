import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));
vi.mock('./apiClient', () => ({ apiRequest: mocks.apiRequest }));

import sittersService from './sittersService';

describe('sittersService.fetchSuggestions', () => {
  beforeEach(() => mocks.apiRequest.mockReset());

  it('calls the booking suggestions endpoint with encoded query params', async () => {
    mocks.apiRequest.mockResolvedValue({ data: [{ id: 1, fullName: 'Mira', matchScore: 0.9, matchReasons: [] }] });

    const result = await sittersService.fetchSuggestions({
      typeOfBooking: 'CHILD',
      locationId: 12,
      bookingFrom: '2026-07-01T10:00:00',
      bookingTo: '2026-07-01T13:00:00',
      childrenIds: [4, 5],
      limit: 5,
    });

    expect(result.success).toBe(true);
    const [url] = mocks.apiRequest.mock.calls[0];
    expect(url).toContain('/bookings/suggestions?');
    expect(url).toContain('typeOfBooking=CHILD');
    expect(url).toContain('locationId=12');
    expect(url).toContain('childrenIds=4%2C5');
    expect(url).toContain('limit=5');
  });
});

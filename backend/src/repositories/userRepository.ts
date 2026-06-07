import { query } from '../config/database';

export interface AppUser {
  id: number;
  user_type: 'customer' | 'sitter';
}

/**
 * Shared lookups for the "resolve the app user from the verified Firebase uid,
 * then resolve their customer/sitter row" pattern repeated across the auth and
 * bookings routers. Returns `null` when not found so callers map to 404.
 */
export const getUserByFirebaseUid = async (firebaseUid: string | undefined): Promise<AppUser | null> => {
  if (!firebaseUid) {
    return null;
  }
  const result = await query('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
  return result.rows[0] ?? null;
};

export const getCustomerIdByUserId = async (userId: number): Promise<number | null> => {
  const result = await query('SELECT id FROM customers WHERE user_id = $1', [userId]);
  return result.rows[0]?.id ?? null;
};

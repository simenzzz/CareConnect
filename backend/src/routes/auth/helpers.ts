import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { getUserByFirebaseUid, getCustomerIdByUserId, getSitterIdByUserId } from '../../repositories/userRepository';

/**
 * Resolve the authenticated customer's id from the verified token, or write the
 * appropriate error response and return null. Centralizes the "lookup user →
 * ensure customer → lookup customer id" guard repeated across the children/pets/
 * locations routers. `resource` is interpolated into the 403 message to preserve
 * the original wording (e.g. "Only customers can manage children").
 */
export const resolveCustomerId = async (
  req: AuthenticatedRequest,
  res: Response,
  resource: string,
): Promise<number | null> => {
  const user = await getUserByFirebaseUid(req.user?.uid);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (user.user_type !== 'customer') {
    res.status(403).json({ error: `Only customers can manage ${resource}` });
    return null;
  }
  const customerId = await getCustomerIdByUserId(user.id);
  if (customerId === null) {
    res.status(404).json({ error: 'Customer profile not found' });
    return null;
  }
  return customerId;
};

export const resolveSitterId = async (
  req: AuthenticatedRequest,
  res: Response,
  resource: string,
): Promise<number | null> => {
  const user = await getUserByFirebaseUid(req.user?.uid);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (user.user_type !== 'sitter') {
    res.status(403).json({ error: `Only sitters can manage ${resource}` });
    return null;
  }
  const sitterId = await getSitterIdByUserId(user.id);
  if (sitterId === null) {
    res.status(404).json({ error: 'Sitter profile not found' });
    return null;
  }
  return sitterId;
};

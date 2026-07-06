import type { UserType } from '../context/AuthContext';

export const portalPathFor = (userType: UserType): string =>
  userType === 'sitter' ? '/sitter-portal' : '/user-portal';

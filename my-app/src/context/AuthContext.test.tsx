import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Capture the Firebase auth-state callback so the test can drive it.
let authCallback: (user: unknown) => void = () => {};
vi.mock('../config/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    authCallback = cb;
    return () => {};
  },
}));

const getProfile = vi.fn(async () => ({
  success: true,
  data: { user: { userType: 'sitter' }, profile: { fullName: 'Sam' } },
}));
vi.mock('../services/authService', () => ({
  default: { getProfile: () => getProfile(), signOut: vi.fn() },
}));

import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { userType, isLoading } = useAuth();
  return <div>{isLoading ? 'loading' : `type:${userType ?? 'none'}`}</div>;
}

describe('AuthContext', () => {
  it('resolves userType from the profile when a user signs in', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Simulate Firebase emitting a signed-in user.
    authCallback({ uid: 'abc' });

    await waitFor(() => expect(screen.getByText('type:sitter')).toBeInTheDocument());
    expect(getProfile).toHaveBeenCalled();
  });

  it('reports no user type when signed out', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    authCallback(null);

    await waitFor(() => expect(screen.getByText('type:none')).toBeInTheDocument());
  });
});

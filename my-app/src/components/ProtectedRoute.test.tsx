import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import type { UserType } from '../context/AuthContext';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderAt = (requiredRole?: UserType) =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div>SECRET CONTENT</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/sitter-portal" element={<div>SITTER PORTAL</div>} />
        <Route path="/user-portal" element={<div>USER PORTAL</div>} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => mockUseAuth.mockReset());

  it('does not render protected content while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, userType: null, isLoading: true });
    renderAt('customer');
    expect(screen.queryByText('SECRET CONTENT')).toBeNull();
  });

  it('redirects an unauthenticated user to the unified login', () => {
    mockUseAuth.mockReturnValue({ user: null, userType: null, isLoading: false });
    renderAt('customer');
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('redirects an unauthenticated sitter route to the unified login', () => {
    mockUseAuth.mockReturnValue({ user: null, userType: null, isLoading: false });
    renderAt('sitter');
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('redirects a wrong-role user to their own portal', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'x' }, userType: 'sitter', isLoading: false });
    renderAt('customer');
    expect(screen.getByText('SITTER PORTAL')).toBeInTheDocument();
  });

  it('redirects a logged-in user with unknown role to home', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'x' }, userType: null, isLoading: false });
    renderAt('customer');
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });

  it('renders children for the matching role', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'x' }, userType: 'customer', isLoading: false });
    renderAt('customer');
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });
});

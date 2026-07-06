import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, userType: null, isLoading: false }),
}))

vi.mock('./pages/HomePage', () => ({ default: () => <div>HOME PAGE</div> }))
vi.mock('./pages/CustomerSignupPage', () => ({ default: () => <div>CUSTOMER SIGNUP PAGE</div> }))
vi.mock('./pages/CareersPage', () => ({ default: () => <div>CAREERS PAGE</div> }))
vi.mock('./pages/LoginPage', () => ({ default: () => <div>LOGIN PAGE</div> }))
vi.mock('./pages/SignupPage', () => ({ default: () => <div>SITTER APPLY PAGE</div> }))
vi.mock('./pages/SittersPage', () => ({ default: () => <div>SITTERS PAGE</div> }))
vi.mock('./pages/SmartMatchPage', () => ({ default: () => <div>SMART MATCH PAGE</div> }))
vi.mock('./pages/UserPortalPage', () => ({ default: () => <div>USER PORTAL PAGE</div> }))
vi.mock('./pages/SitterPortalPage', () => ({ default: () => <div>SITTER PORTAL PAGE</div> }))
vi.mock('./pages/NotFoundPage', () => ({ default: () => <div>NOT FOUND PAGE</div> }))

const renderRoute = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )

describe('AppRoutes', () => {
  it('redirects the old mixed portal to customer signup', () => {
    renderRoute('/portal')
    expect(screen.getByText('CUSTOMER SIGNUP PAGE')).toBeInTheDocument()
  })

  it('renders the careers portal', () => {
    renderRoute('/careers')
    expect(screen.getByText('CAREERS PAGE')).toBeInTheDocument()
  })

  it('renders the unified login page at /login', () => {
    renderRoute('/login')
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
  })

  it('redirects the legacy customer-login URL to the unified login', () => {
    renderRoute('/customer-login')
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
  })

  it('redirects the legacy sitter login URL to the unified login', () => {
    renderRoute('/careers/sitter/login')
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
  })

  it('shows not found for an unknown URL', () => {
    renderRoute('/signup')
    expect(screen.getByText('NOT FOUND PAGE')).toBeInTheDocument()
  })
})

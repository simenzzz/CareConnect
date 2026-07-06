import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('../components/Header', () => ({ default: () => null }))
vi.mock('../services/authService', () => ({
  authService: {
    login: mocks.login,
  },
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )

const fillAndSubmit = async () => {
  const user = userEvent.setup()
  renderPage()
  await user.type(screen.getByLabelText(/Email Address/i), 'person@example.test')
  await user.type(screen.getByLabelText(/^Password/i), 'Strong1!')
  await user.click(screen.getByRole('button', { name: /Sign in/i }))
  return user
}

describe('LoginPage role-based redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not send an expectedUserType — the backend resolves the role', async () => {
    mocks.login.mockResolvedValue({ success: true, data: { user: { userType: 'customer' } } })
    await fillAndSubmit()
    expect(mocks.login).toHaveBeenCalledWith(
      expect.not.objectContaining({ expectedUserType: expect.anything() }),
    )
  })

  it('redirects a customer to /user-portal', async () => {
    mocks.login.mockResolvedValue({ success: true, data: { user: { userType: 'customer' } } })
    await fillAndSubmit()
    expect(mocks.navigate).toHaveBeenCalledWith('/user-portal')
  })

  it('redirects a sitter to /sitter-portal', async () => {
    mocks.login.mockResolvedValue({ success: true, data: { user: { userType: 'sitter' } } })
    await fillAndSubmit()
    expect(mocks.navigate).toHaveBeenCalledWith('/sitter-portal')
  })

  it('shows the error and does not navigate when login fails', async () => {
    mocks.login.mockResolvedValue({ success: false, error: 'Invalid email or password.' })
    await fillAndSubmit()
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})

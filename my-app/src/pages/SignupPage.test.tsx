import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignupPage from './SignupPage'

const mocks = vi.hoisted(() => ({
  createFirebaseAccount: vi.fn(),
  registerProfile: vi.fn(),
  deleteCurrentFirebaseUser: vi.fn(),
  uploadProfileImage: vi.fn(),
  uploadCV: vi.fn(),
  uploadIdentityDocument: vi.fn(),
  deleteFile: vi.fn(),
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
vi.mock('../components/booking/useLocationMap', () => ({
  useLocationMap: () => ({ mapRef: { current: null }, searchInputRef: { current: null } }),
}))
vi.mock('../services/authService', () => ({
  authService: {
    createFirebaseAccount: mocks.createFirebaseAccount,
    registerProfile: mocks.registerProfile,
    deleteCurrentFirebaseUser: mocks.deleteCurrentFirebaseUser,
  },
}))
vi.mock('../services/storageService', () => ({
  default: {
    uploadProfileImage: mocks.uploadProfileImage,
    uploadCV: mocks.uploadCV,
    uploadIdentityDocument: mocks.uploadIdentityDocument,
    deleteFile: mocks.deleteFile,
  },
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  )

describe('SignupPage sitter file cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn(() => 'blob:profile-preview')
    global.URL.revokeObjectURL = vi.fn()
    mocks.createFirebaseAccount.mockResolvedValue({
      success: true,
      user: { getIdToken: vi.fn(async () => 'token') },
    })
    mocks.uploadProfileImage.mockResolvedValue({
      success: true,
      url: 'https://firebasestorage.googleapis.com/v0/b/careconnect.test/o/sitter-profile-images%2Fuid%2Fprofile.jpg?alt=media',
      path: 'sitter-profile-images/uid/profile.jpg',
    })
    mocks.uploadCV.mockResolvedValue({
      success: true,
      url: 'https://firebasestorage.googleapis.com/v0/b/careconnect.test/o/sitter-documents%2Fuid%2Fcv%2Fcv.pdf?alt=media',
      path: 'sitter-documents/uid/cv/cv.pdf',
    })
    mocks.uploadIdentityDocument.mockResolvedValue({
      success: true,
      url: 'https://firebasestorage.googleapis.com/v0/b/careconnect.test/o/sitter-documents%2Fuid%2Fidentity%2Fid.png?alt=media',
      path: 'sitter-documents/uid/identity/id.png',
    })
    mocks.deleteFile.mockResolvedValue(undefined)
    mocks.registerProfile.mockRejectedValue(new Error('Registration failed after uploads'))
  })

  it('deletes uploaded files and the Firebase user when backend registration fails', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Full Name/i), 'Nour Khoury')
    await user.type(screen.getByLabelText(/Date of Birth/i), '1998-03-18')
    await user.selectOptions(screen.getByLabelText(/Area in Lebanon/i), 'Beirut')
    await user.selectOptions(screen.getByLabelText(/^Location/i), 'Hamra')
    await user.selectOptions(screen.getByLabelText(/How many hours/i), '20')
    await user.click(screen.getByLabelText(/Pet Sitter/i))
    await user.type(screen.getByLabelText(/Email Address/i), 'nour@example.test')
    await user.type(screen.getByLabelText(/^Phone Number/i), '+96171210110')
    await user.type(screen.getByLabelText(/^Password/i), 'Strong1!')
    await user.type(screen.getByLabelText(/Confirm Password/i), 'Strong1!')
    await user.upload(
      screen.getByLabelText(/Public sitter profile photo/i),
      new File(['profile'], 'profile.jpg', { type: 'image/jpeg' }),
    )
    await user.upload(screen.getByLabelText(/CV\/Resume/i), new File(['cv'], 'cv.pdf', { type: 'application/pdf' }))
    await user.upload(
      screen.getByLabelText(/Identity Document/i),
      new File(['id'], 'id.png', { type: 'image/png' }),
    )
    await user.click(screen.getByLabelText(/I agree/i))
    await user.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => expect(mocks.registerProfile).toHaveBeenCalled())
    await waitFor(() => expect(mocks.deleteCurrentFirebaseUser).toHaveBeenCalledTimes(1))
    expect(mocks.deleteFile).toHaveBeenCalledWith('sitter-profile-images/uid/profile.jpg')
    expect(mocks.deleteFile).toHaveBeenCalledWith('sitter-documents/uid/cv/cv.pdf')
    expect(mocks.deleteFile).toHaveBeenCalledWith('sitter-documents/uid/identity/id.png')
    expect(screen.getByText('Registration failed after uploads')).toBeInTheDocument()
  })
})

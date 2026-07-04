import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BabySitterCard from './BabySitterCard'
import PetSitterCard from './PetSitterCard'

vi.mock('./BookingModal', () => ({ default: () => null }))

const baseSitter = {
  id: 1,
  name: 'Nour Khoury',
  area: 'Beirut, Achrafieh',
  experience: 'Verified CareConnect sitter',
  rating: 4.8,
  specialties: ['First Aid'],
  profileImageUrl: 'https://example.test/profile.jpg',
}

describe('sitter cards', () => {
  it('renders a sitter profile photo when one is available', () => {
    const { container } = render(<BabySitterCard sitter={baseSitter} />)

    expect(container.querySelector('.sitter-avatar img')).toHaveAttribute('src', baseSitter.profileImageUrl)
  })

  it('falls back to the icon avatar when the profile photo fails to load', () => {
    const { container } = render(<PetSitterCard sitter={baseSitter} />)
    const image = container.querySelector('.sitter-avatar img')

    expect(image).not.toBeNull()
    fireEvent.error(image as HTMLImageElement)

    expect(container.querySelector('.sitter-avatar img')).toBeNull()
    expect(container.querySelector('.sitter-avatar svg')).not.toBeNull()
  })
})

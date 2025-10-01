import React, { useState } from 'react'
import BookingModal from './BookingModal'
import './PetSitterCard.css'

interface PetSitter {
  id: number
  name: string
  area: string
  experience: string
  rating: number
  specialties: string[]
}

interface PetSitterCardProps {
  sitter: PetSitter
}

const PetSitterCard: React.FC<PetSitterCardProps> = ({ sitter }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  
  // Mock data - in real app this would come from context/API
  const isLoggedIn = false // TODO: Get from auth context
  const userPets = [
    { id: '1', name: 'Buddy', type: 'Dog' },
    { id: '2', name: 'Whiskers', type: 'Cat' }
  ]

  const handleBookSession = () => {
    setIsBookingModalOpen(true)
  }

  return (
    <div className="pet-sitter-card">
      <div className="sitter-header">
        <div className="sitter-avatar">
          <i className="fas fa-paw"></i>
        </div>
        <div className="sitter-info">
          <h3>{sitter.name}</h3>
          <p className="sitter-location">
            <i className="fas fa-map-marker-alt"></i>
            {sitter.area}, Lebanon
          </p>
        </div>
        <div className="sitter-rating">
          <i className="fas fa-star"></i>
          <span>{sitter.rating}</span>
        </div>
      </div>
      
      <div className="sitter-details">
        <p className="sitter-experience">{sitter.experience}</p>
        <div className="sitter-specialties">
          {sitter.specialties.map((specialty, index) => (
            <span key={index} className="specialty-tag">
              {specialty}
            </span>
          ))}
        </div>
      </div>
      
      <div className="sitter-contact">
        <button 
          className="book-session-btn"
          onClick={handleBookSession}
        >
          <i className="fas fa-calendar-plus"></i>
          Book a Session
        </button>
      </div>
      
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        sitterName={sitter.name}
        sitterType="pet"
        isLoggedIn={isLoggedIn}
        userPets={userPets}
      />
    </div>
  )
}

export default PetSitterCard

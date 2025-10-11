import React, { useState } from 'react'
import BookingModal from './BookingModal'
import './BabySitterCard.css'

interface BabySitter {
  id: number
  name: string
  area: string
  experience: string
  rating: number
  specialties: string[]
}

interface BabySitterCardProps {
  sitter: BabySitter
}

const BabySitterCard: React.FC<BabySitterCardProps> = ({ sitter }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  
  // Note: isLoggedIn is checked inside BookingModal via Firebase
  const isLoggedIn = false

  const handleBookSession = () => {
    setIsBookingModalOpen(true)
  }

  return (
    <div className="baby-sitter-card">
      <div className="sitter-header">
        <div className="sitter-avatar">
          <i className="fas fa-baby"></i>
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
        sitterId={sitter.id}
        sitterType="baby"
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}

export default BabySitterCard

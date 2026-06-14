import React, { useState } from 'react'
import { PawPrint, MapPin, Star, WandSparkles, CalendarPlus } from 'lucide-react'
import BookingModal from './BookingModal'
import './PetSitterCard.css'

interface PetSitter {
  id: number
  name: string
  area: string
  experience: string
  rating: number
  specialties: string[]
  matchReasons?: string[]
  matchScore?: number
  matchEventId?: number
}

interface PetSitterCardProps {
  sitter: PetSitter
  initialBookingContext?: {
    selectedEntityIds: number[]
    selectedLocationId: string
    bookingDate: string
    startTime: string
    endTime: string
    matchEventId?: number
  }
}

const PetSitterCard: React.FC<PetSitterCardProps> = ({ sitter, initialBookingContext }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  
  // Note: isLoggedIn is checked inside BookingModal via Firebase
  const isLoggedIn = false

  const handleBookSession = () => {
    setIsBookingModalOpen(true)
  }

  return (
    <div className="pet-sitter-card">
      <div className="sitter-header">
        <div className="sitter-avatar">
          <PawPrint size={26} />
        </div>
        <div className="sitter-info">
          <h3>{sitter.name}</h3>
          <p className="sitter-location">
            <MapPin size={14} />
            {sitter.area}, Lebanon
          </p>
        </div>
        <div className="sitter-rating">
          <Star size={14} fill="currentColor" />
          <span>{sitter.rating}</span>
        </div>
      </div>

      <div className="sitter-details">
        <p className="sitter-experience">{sitter.experience}</p>
        {sitter.matchReasons && sitter.matchReasons.length > 0 && (
          <p className="match-reasons">
            <WandSparkles size={16} />
            {sitter.matchReasons.slice(0, 2).join(' • ')}
          </p>
        )}
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
          <CalendarPlus size={18} />
          Book a Session
        </button>
      </div>
      
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        sitterName={sitter.name}
        sitterId={sitter.id}
        sitterType="pet"
        isLoggedIn={isLoggedIn}
        initialBookingContext={initialBookingContext}
      />
    </div>
  )
}

export default PetSitterCard

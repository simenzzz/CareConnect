import React from 'react'
import { User, Star } from 'lucide-react'
import './SitterCard.css'

interface SitterCardProps {
  sitter: {
    id: number
    name: string
    age: number
    area: string
    city: string
    sitterType: string[]
    experience: string
    rating: number
    image?: string
  }
}

const SitterCard: React.FC<SitterCardProps> = ({ sitter }) => {
  return (
    <div className="sitter-card">
      <div className="sitter-image">
        {sitter.image ? (
          <img src={sitter.image} alt={sitter.name} />
        ) : (
          <div className="sitter-placeholder">
            <User size={56} strokeWidth={1.25} />
          </div>
        )}
      </div>
      
      <div className="sitter-info">
        <h3>{sitter.name}</h3>
        <p className="sitter-location">{sitter.area}, {sitter.city}</p>
        
        <div className="sitter-types">
          {sitter.sitterType.map((type, index) => (
            <span key={index} className="sitter-type">{type}</span>
          ))}
        </div>
        
        <div className="sitter-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={15}
                className={i < sitter.rating ? 'filled' : ''}
                fill={i < sitter.rating ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="rating-text">{sitter.rating}/5</span>
        </div>
        
        <p className="sitter-experience">{sitter.experience}</p>
        
        <button className="contact-btn">Contact</button>
      </div>
    </div>
  )
}

export default SitterCard
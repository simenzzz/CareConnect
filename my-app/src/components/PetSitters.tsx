import React from 'react'
import SitterCard from './SitterCard'
import './PetSitters.css'

const PetSitters: React.FC = () => {
  // Mock data - in real app this would come from API
  const petsitters = [
    {
      id: 1,
      name: "Jessica Williams",
      age: 26,
      area: "Manhattan",
      city: "New York",
      sitterType: ["Pet Sitting", "Dog Walking"],
      experience: "Veterinary assistant with 4 years experience. Loves all animals!",
      rating: 4.9
    },
    {
      id: 2,
      name: "David Kim",
      age: 32,
      area: "Queens",
      city: "New York",
      sitterType: ["Pet Sitting", "Training"],
      experience: "Professional dog trainer and pet sitter. Specializes in large breeds.",
      rating: 4.8
    },
    {
      id: 3,
      name: "Lisa Thompson",
      age: 29,
      area: "Bronx",
      city: "New York",
      sitterType: ["Pet Sitting", "Cat Care"],
      experience: "Cat behavior specialist with 6 years experience. Great with shy pets.",
      rating: 4.7
    }
  ]

  return (
    <section className="pet-sitters">
      <div className="container">
        <h2>Top Pet Sitters in Your Area</h2>
        <div className="sitters-grid">
          {petsitters.map(sitter => (
            <SitterCard key={sitter.id} sitter={sitter} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default PetSitters
import React from 'react'
import SitterCard from './SitterCard'
import './BabySitters.css'

const BabySitters: React.FC = () => {
  // Mock data - in real app this would come from API
  const babysitters = [
    {
      id: 1,
      name: "Sarah Johnson",
      age: 25,
      area: "Downtown",
      city: "New York",
      sitterType: ["Babysitting", "Tutoring"],
      experience: "5 years of experience with children aged 2-12. CPR certified.",
      rating: 4.8
    },
    {
      id: 2,
      name: "Emily Chen",
      age: 28,
      area: "Midtown",
      city: "New York",
      sitterType: ["Babysitting", "Special Needs"],
      experience: "Specialized in caring for children with special needs. Early childhood education degree.",
      rating: 4.9
    },
    {
      id: 3,
      name: "Michael Rodriguez",
      age: 30,
      area: "Brooklyn",
      city: "New York",
      sitterType: ["Babysitting", "Sports"],
      experience: "Former teacher with 7 years experience. Great with active kids and sports activities.",
      rating: 4.7
    }
  ]

  return (
    <section className="baby-sitters">
      <div className="container">
        <h2>Top Babysitters in Your Area</h2>
        <div className="sitters-grid">
          {babysitters.map(sitter => (
            <SitterCard key={sitter.id} sitter={sitter} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default BabySitters
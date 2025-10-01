import React, { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import PetSitterCard from '../components/PetSitterCard'
import BabySitterCard from '../components/BabySitterCard'
import './SittersPage.css'

const SittersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pet' | 'baby'>('pet')
  const [searchLocation, setSearchLocation] = useState('')

  // Mock data for Pet Sitters
  const petSitters = [
    {
      id: 1,
      name: "Jessica Williams",
      area: "Beirut",
      experience: "Veterinary assistant with 4 years experience. Loves all animals and specializes in dog care.",
      rating: 4.9,
      specialties: ["Dog Walking", "Pet Grooming", "Medication Admin"]
    },
    {
      id: 2,
      name: "David Kim",
      area: "Tripoli",
      experience: "Professional dog trainer and pet sitter. Specializes in large breeds and behavioral training.",
      rating: 4.8,
      specialties: ["Dog Training", "Large Breeds", "Behavioral Issues"]
    },
    {
      id: 3,
      name: "Lisa Thompson",
      area: "Sidon",
      experience: "Cat behavior specialist with 6 years experience. Great with shy pets and exotic animals.",
      rating: 4.7,
      specialties: ["Cat Care", "Exotic Pets", "Senior Pet Care"]
    },
    {
      id: 4,
      name: "Ahmed Hassan",
      area: "Tyre",
      experience: "Animal lover with 3 years experience. Available for overnight pet sitting and emergency care.",
      rating: 4.6,
      specialties: ["Overnight Care", "Emergency Care", "Multi-Pet Households"]
    }
  ]

  // Mock data for Baby Sitters
  const babySitters = [
    {
      id: 1,
      name: "Sarah Johnson",
      area: "Beirut",
      experience: "5 years of experience with children aged 2-12. CPR certified and early childhood education background.",
      rating: 4.8,
      specialties: ["Toddler Care", "CPR Certified", "Educational Activities"]
    },
    {
      id: 2,
      name: "Emily Chen",
      area: "Jounieh",
      experience: "Specialized in caring for children with special needs. Early childhood education degree and 6 years experience.",
      rating: 4.9,
      specialties: ["Special Needs", "Early Education", "Therapeutic Activities"]
    },
    {
      id: 3,
      name: "Michael Rodriguez",
      area: "Zahle",
      experience: "Former teacher with 7 years experience. Great with active kids and sports activities.",
      rating: 4.7,
      specialties: ["Sports Activities", "Homework Help", "Outdoor Play"]
    },
    {
      id: 4,
      name: "Fatima Al-Rashid",
      area: "Baalbek",
      experience: "Mother of three with 8 years babysitting experience. Fluent in Arabic and English.",
      rating: 4.8,
      specialties: ["Bilingual Care", "Infant Care", "Cultural Activities"]
    }
  ]

  const currentSitters = activeTab === 'pet' ? petSitters : babySitters
  
  const filteredSitters = currentSitters.filter(sitter => {
    const locationMatch = !searchLocation || 
      sitter.area.toLowerCase().includes(searchLocation.toLowerCase())
    return locationMatch
  })

  return (
    <div className="sitters-page">
      <PageHeader />
      <main className="sitters-main">
        <div className="sitters-hero">
          <div className="container">
            <h1>Find Your Perfect Sitter</h1>
            <p>Browse our verified sitters and find the perfect match for your family</p>
          </div>
        </div>

        <div className="sitters-tabs">
          <div className="container">
            <div className="tabs-container">
              <button 
                className={`tab-btn ${activeTab === 'pet' ? 'active' : ''}`}
                onClick={() => setActiveTab('pet')}
              >
                <i className="fas fa-paw"></i>
                Pet Sitters
              </button>
              <button 
                className={`tab-btn ${activeTab === 'baby' ? 'active' : ''}`}
                onClick={() => setActiveTab('baby')}
              >
                <i className="fas fa-baby"></i>
                Baby Sitters
              </button>
            </div>
          </div>
        </div>

        <div className="sitters-filters">
          <div className="container">
            <div className="filters-container">
              <div className="filter-group">
                <label htmlFor="location">Location in Lebanon</label>
                <input
                  type="text"
                  id="location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Enter area (e.g., Beirut, Tripoli, Sidon)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sitters-results">
          <div className="container">
            <div className="results-header">
              <h2>
                {activeTab === 'pet' ? 'Pet Sitters' : 'Baby Sitters'} 
                ({filteredSitters.length})
              </h2>
              <p>
                {activeTab === 'pet' 
                  ? 'Professional pet care specialists ready to care for your furry friends'
                  : 'Experienced childcare providers ready to care for your little ones'
                }
              </p>
            </div>
            
            <div className="sitters-grid">
              {filteredSitters.map(sitter => (
                activeTab === 'pet' ? (
                  <PetSitterCard key={sitter.id} sitter={sitter} />
                ) : (
                  <BabySitterCard key={sitter.id} sitter={sitter} />
                )
              ))}
            </div>

            {filteredSitters.length === 0 && (
              <div className="no-results">
                <h3>No {activeTab === 'pet' ? 'pet sitters' : 'baby sitters'} found</h3>
                <p>Try adjusting your search criteria or check back later for new sitters.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SittersPage